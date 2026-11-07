import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { downloadAndSaveFile } from "@/lib/fileStorage";
import type { ImportedCard } from "@/lib/importers";

type Params = { params: Promise<{ id: string }> };
type PendingItem = { columnId: string; card: ImportedCard };

const BATCH_SIZE = 10;

/** Processa o próximo lote de cards pendentes de um job de importação - chamado repetidamente pelo cliente até o status virar COMPLETED. */
export async function POST(_request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const job = await prisma.importJob.findUnique({ where: { id } });
  if (!job) return Response.json({ error: "Importação não encontrada" }, { status: 404 });

  if (job.status === "COMPLETED" || job.status === "FAILED") {
    return Response.json({ status: job.status, importedCards: job.importedCards, totalCards: job.totalCards, errorMessage: job.errorMessage });
  }

  const pending: PendingItem[] = job.pendingData ? JSON.parse(job.pendingData) : [];
  const batch = pending.slice(0, BATCH_SIZE);
  const rest = pending.slice(BATCH_SIZE);

  try {
    // Posição inicial de cada coluna tocada nesse lote, pra não sobrescrever
    // cards já criados em lotes anteriores da mesma coluna.
    const columnIds = Array.from(new Set(batch.map((item) => item.columnId)));
    const positions = new Map<string, number>();
    for (const columnId of columnIds) {
      const max = await prisma.kanbanCard.aggregate({ _max: { position: true }, where: { columnId } });
      positions.set(columnId, (max._max.position ?? -1) + 1);
    }

    for (const item of batch) {
      const nextPosition = positions.get(item.columnId) ?? 0;
      positions.set(item.columnId, nextPosition + 1);

      const attachments = (
        await Promise.all(item.card.attachments.map((a) => downloadAndSaveFile(a.url, a.name)))
      ).filter((a): a is NonNullable<typeof a> => a !== null);

      await prisma.kanbanCard.create({
        data: {
          title: item.card.title.slice(0, 500) || "Sem título",
          description: item.card.description || null,
          dueDate: item.card.dueDate ? new Date(item.card.dueDate) : null,
          position: nextPosition,
          columnId: item.columnId,
          clientId: job.clientId,
          attachments: {
            create: attachments.map((a, i) => ({ url: a.url, type: a.type, name: a.name, position: i })),
          },
        },
      });
    }

    const importedCards = job.importedCards + batch.length;
    const completed = rest.length === 0;
    const updated = await prisma.importJob.update({
      where: { id: job.id },
      data: {
        importedCards,
        pendingData: completed ? null : JSON.stringify(rest),
        status: completed ? "COMPLETED" : "RUNNING",
        completedAt: completed ? new Date() : null,
      },
    });

    return Response.json({
      status: updated.status,
      importedCards: updated.importedCards,
      totalCards: updated.totalCards,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao processar lote de importação";
    await prisma.importJob.update({ where: { id: job.id }, data: { status: "FAILED", errorMessage: message } });
    return Response.json({ error: message }, { status: 500 });
  }
}
