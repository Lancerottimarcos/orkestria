import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { runColumnAutomations } from "@/lib/automations";

export async function POST(request: Request) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const body = await request.json();
  const columns = body?.columns as { columnId: string; cardIds: string[] }[] | undefined;

  if (!Array.isArray(columns)) {
    return Response.json({ error: "Payload inválido" }, { status: 400 });
  }

  const allCardIds = columns.flatMap((c) => c.cardIds);
  const existingCards = await prisma.kanbanCard.findMany({
    where: { id: { in: allCardIds } },
    select: { id: true, columnId: true, position: true },
  });
  const previousMap = new Map(existingCards.map((c) => [c.id, { columnId: c.columnId, position: c.position }]));
  const previousColumnMap = new Map(existingCards.map((c) => [c.id, c.columnId]));

  // Só grava .update() nos cards cuja coluna OU posição realmente mudou -
  // Prisma bate `updatedAt` (@updatedAt) em todo .update(), mesmo sem
  // nenhum campo mudar de valor, e runTimeBasedAutomations usa updatedAt
  // como proxy de "tempo parado" (CARD_IDLE). Sem esse diff, arrastar
  // qualquer card resetava silenciosamente o relógio de idle de TODOS os
  // outros cards da mesma coluna, mesmo os que não se moveram.
  const updates = columns.flatMap((col) =>
    col.cardIds
      .map((cardId, index) => ({ cardId, index }))
      .filter(({ cardId, index }) => {
        const prev = previousMap.get(cardId);
        return !prev || prev.columnId !== col.columnId || prev.position !== index;
      })
      .map(({ cardId, index }) =>
        prisma.kanbanCard.update({
          where: { id: cardId },
          data: { columnId: col.columnId, position: index },
        }),
      ),
  );
  if (updates.length) await prisma.$transaction(updates);

  for (const col of columns) {
    for (const cardId of col.cardIds) {
      if (previousColumnMap.get(cardId) !== col.columnId) {
        await runColumnAutomations(cardId, col.columnId);
      }
    }
  }

  return Response.json({ ok: true });
}
