import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";

type Params = { params: Promise<{ id: string }> };

const CARD_INCLUDE = {
  client: true,
  project: true,
  assignee: { select: { id: true, name: true, avatarUrl: true } },
  post: { select: { id: true, title: true, status: true, token: true, feedback: true } },
  demandType: true,
  attachments: { orderBy: { position: "asc" as const } },
  comments: {
    orderBy: { createdAt: "asc" as const },
    include: {
      author: { select: { id: true, name: true } },
      mentionedUser: { select: { id: true, name: true } },
    },
  },
  checklists: { include: { items: true } },
};

/** Arquiva ou restaura uma demanda concluída. body: { archived: boolean } */
export async function POST(request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const archived = Boolean(body?.archived);

  const card = await prisma.kanbanCard.findUnique({ where: { id } });
  if (!card) {
    return Response.json({ error: "Demanda não encontrada" }, { status: 404 });
  }

  if (archived) {
    await prisma.kanbanCard.update({ where: { id }, data: { archivedAt: new Date() } });
    return Response.json({ ok: true });
  }

  // Restaurar: volta para o fim da coluna original para não conflitar posições
  const maxPosition = await prisma.kanbanCard.aggregate({
    _max: { position: true },
    where: { columnId: card.columnId, archivedAt: null },
  });
  const restored = await prisma.kanbanCard.update({
    where: { id },
    data: { archivedAt: null, position: (maxPosition._max.position ?? -1) + 1 },
    include: CARD_INCLUDE,
  });

  return Response.json({
    ...restored,
    checklists: restored.checklists.map((cl) => ({
      id: cl.id,
      title: cl.title,
      total: cl.items.length,
      done: cl.items.filter((i) => i.done).length,
    })),
  });
}
