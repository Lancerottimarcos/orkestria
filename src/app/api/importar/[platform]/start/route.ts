import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { importStartSchema } from "@/lib/schemas";
import { getImporter, parsePlatformSlug, ImportSourceError, type ImportedCard } from "@/lib/importers";

type Params = { params: Promise<{ platform: string }> };
type PendingItem = { columnId: string; card: ImportedCard };

/**
 * Busca o quadro inteiro na origem (uma vez só, aqui) e cria o quadro/colunas
 * de destino já de cara - os CARDS em si (e o download dos anexos, a parte
 * lenta) ficam pendentes em `pendingData` e são criados aos poucos por
 * /jobs/[id]/continue, pra dar uma barra de progresso real em vez de uma
 * chamada só que trava a tela em quadros grandes.
 */
export async function POST(request: Request, { params }: Params) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { platform: slug } = await params;
  const platform = parsePlatformSlug(slug);
  if (!platform) return Response.json({ error: "Plataforma não suportada" }, { status: 404 });

  const body = await request.json();
  const parsed = importStartSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  let sourceBoard;
  try {
    sourceBoard = await getImporter(platform).fetchBoard(data.token, data.sourceBoardId);
  } catch (err) {
    const message = err instanceof ImportSourceError ? err.message : "Não foi possível buscar o quadro de origem";
    return Response.json({ error: message }, { status: 400 });
  }

  const maxBoardPosition = await prisma.kanbanBoard.aggregate({ _max: { position: true } });
  const targetBoard = await prisma.kanbanBoard.create({
    data: {
      name: data.targetBoardName,
      clientId: data.clientId || null,
      position: (maxBoardPosition._max.position ?? -1) + 1,
    },
  });

  const pendingData: PendingItem[] = [];
  for (let i = 0; i < sourceBoard.columns.length; i++) {
    const col = sourceBoard.columns[i];
    const column = await prisma.kanbanColumn.create({
      data: { name: col.name || "Sem nome", position: i, boardId: targetBoard.id },
    });
    for (const card of col.cards) pendingData.push({ columnId: column.id, card });
  }

  const job = await prisma.importJob.create({
    data: {
      platform,
      status: pendingData.length > 0 ? "RUNNING" : "COMPLETED",
      sourceBoardId: data.sourceBoardId,
      sourceBoardName: data.sourceBoardName,
      totalCards: pendingData.length,
      pendingData: pendingData.length > 0 ? JSON.stringify(pendingData) : null,
      completedAt: pendingData.length > 0 ? null : new Date(),
      targetBoardId: targetBoard.id,
      clientId: data.clientId || null,
      createdById: session!.user.id,
    },
  });

  return Response.json({ id: job.id, totalCards: job.totalCards, targetBoardId: targetBoard.id }, { status: 201 });
}
