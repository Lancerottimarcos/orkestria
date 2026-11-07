import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { kanbanCardSchema } from "@/lib/schemas";
import { runColumnAutomations } from "@/lib/automations";

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

function serializeCard<T extends { checklists: { id: string; title: string; items: { done: boolean }[] }[] }>(
  card: T,
) {
  return {
    ...card,
    checklists: card.checklists.map((cl) => ({
      id: cl.id,
      title: cl.title,
      total: cl.items.length,
      done: cl.items.filter((i) => i.done).length,
    })),
  };
}

export async function POST(request: Request) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const body = await request.json();
  const parsed = kanbanCardSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const maxPosition = await prisma.kanbanCard.aggregate({
    _max: { position: true },
    where: { columnId: data.columnId },
  });

  const created = await prisma.kanbanCard.create({
    data: {
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      columnId: data.columnId,
      clientId: data.clientId || null,
      projectId: data.projectId || null,
      assigneeId: data.assigneeId || null,
      postId: data.postId || null,
      demandTypeId: data.demandTypeId || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      estimatedHours: data.estimatedHours ?? null,
      position: (maxPosition._max.position ?? -1) + 1,
      attachments: {
        create: (data.attachments ?? []).map((a, i) => ({
          url: a.url,
          type: a.type,
          name: a.name || null,
          position: i,
        })),
      },
    },
  });

  await runColumnAutomations(created.id, created.columnId);

  const card = await prisma.kanbanCard.findUnique({ where: { id: created.id }, include: CARD_INCLUDE });

  return Response.json(card ? serializeCard(card) : card, { status: 201 });
}
