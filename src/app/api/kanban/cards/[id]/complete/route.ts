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

/** Marca ou desmarca uma demanda como concluída. body: { completed: boolean } */
export async function POST(request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const completed = Boolean(body?.completed);

  const updated = await prisma.kanbanCard.update({
    where: { id },
    data: { completedAt: completed ? new Date() : null },
    include: CARD_INCLUDE,
  });

  return Response.json({
    ...updated,
    checklists: updated.checklists.map((cl) => ({
      id: cl.id,
      title: cl.title,
      total: cl.items.length,
      done: cl.items.filter((i) => i.done).length,
    })),
  });
}
