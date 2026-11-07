import { prisma } from "@/lib/prisma";

const FALLBACK_COLUMNS = ["A Fazer", "Em andamento", "Aprovação", "Concluído"];

/**
 * Cria um KanbanBoard novo a partir de um BoardTemplate (colunas + cards
 * iniciais) - ou de um conjunto padrão de colunas se nenhum template for
 * passado. Usado tanto pela automação de propostas (ver pipeline.ts) quanto
 * pelo botão manual "Novo quadro a partir de um modelo" em /kanban.
 */
export async function instantiateBoardFromTemplate(opts: { name: string; clientId?: string | null; templateId?: string | null }) {
  const template = opts.templateId
    ? await prisma.boardTemplate.findUnique({
        where: { id: opts.templateId },
        include: { columns: { orderBy: { position: "asc" }, include: { cards: { orderBy: { position: "asc" } } } } },
      })
    : null;

  const maxPosition = await prisma.kanbanBoard.aggregate({ _max: { position: true } });
  const board = await prisma.kanbanBoard.create({
    data: { name: opts.name, clientId: opts.clientId ?? null, position: (maxPosition._max.position ?? -1) + 1 },
  });

  const columnsToCreate = template?.columns.length
    ? template.columns.map((c) => ({ name: c.name, color: c.color, cards: c.cards.map((card) => ({ title: card.title })) }))
    : FALLBACK_COLUMNS.map((name) => ({ name, color: null as string | null, cards: [] as { title: string }[] }));

  for (const [i, col] of columnsToCreate.entries()) {
    const createdColumn = await prisma.kanbanColumn.create({ data: { name: col.name, color: col.color, boardId: board.id, position: i } });
    for (const [j, card] of col.cards.entries()) {
      await prisma.kanbanCard.create({ data: { title: card.title, columnId: createdColumn.id, clientId: opts.clientId ?? null, position: j } });
    }
  }

  return board;
}
