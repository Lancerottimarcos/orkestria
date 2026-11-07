import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { kanbanCardSchema } from "@/lib/schemas";
import { runColumnAutomations, runTypeChangeAutomations } from "@/lib/automations";

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

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = kanbanCardSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const existing = await prisma.kanbanCard.findUnique({ where: { id } });

  const newDueDate = data.dueDate ? new Date(data.dueDate) : null;
  const dueDateChanged = existing && existing.dueDate?.getTime() !== newDueDate?.getTime();

  // Apagar os anexos antigos e criar os novos precisa ser atômico - se o
  // create falhar depois do deleteMany sem transação, os anexos antigos já
  // teriam sumido e nenhum novo seria criado.
  await prisma.$transaction([
    prisma.attachment.deleteMany({ where: { cardId: id } }),
    prisma.kanbanCard.update({
      where: { id },
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
        dueDate: newDueDate,
        estimatedHours: data.estimatedHours ?? null,
        ...(dueDateChanged ? { urgentAlerted: false } : {}),
        attachments: {
          create: (data.attachments ?? []).map((a, i) => ({
            url: a.url,
            type: a.type,
            name: a.name || null,
            position: i,
          })),
        },
      },
    }),
  ]);

  if (existing && existing.columnId !== data.columnId) {
    await runColumnAutomations(id, data.columnId);
  }
  if (existing && existing.demandTypeId !== (data.demandTypeId || null) && data.demandTypeId) {
    await runTypeChangeAutomations(id, data.demandTypeId);
  }

  const card = await prisma.kanbanCard.findUnique({ where: { id }, include: CARD_INCLUDE });

  return Response.json(card ? serializeCard(card) : card);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  await prisma.kanbanCard.delete({ where: { id } });
  return Response.json({ ok: true });
}
