import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { columnAutomationSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

const AUTOMATION_INCLUDE = {
  triggerDemandType: { select: { id: true, name: true, color: true } },
  assignee: { select: { id: true, name: true } },
  mentionUser: { select: { id: true, name: true } },
  setDemandType: { select: { id: true, name: true, color: true } },
  moveToColumn: { select: { id: true, name: true } },
  // Power-up "deste card" fica preso à coluna em que foi criado - mostra
  // esse vínculo pra ficar claro quando o card já mudou de coluna e o
  // power-up parou de disparar.
  column: { select: { id: true, name: true } },
};

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  const automations = await prisma.columnAutomation.findMany({
    where: { cardId: id },
    orderBy: { position: "asc" },
    include: AUTOMATION_INCLUDE,
  });

  return Response.json(automations);
}

export async function POST(request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  const card = await prisma.kanbanCard.findUnique({ where: { id }, select: { columnId: true } });
  if (!card) {
    return Response.json({ error: "Demanda não encontrada" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = columnAutomationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const maxPosition = await prisma.columnAutomation.aggregate({
    _max: { position: true },
    where: { cardId: id },
  });

  const automation = await prisma.columnAutomation.create({
    data: {
      columnId: card.columnId,
      cardId: id,
      trigger: data.trigger,
      action: data.action,
      triggerDemandTypeId: data.trigger === "TYPE_CHANGED_TO" ? data.triggerDemandTypeId || null : null,
      triggerThresholdDays: (data.trigger === "CARD_IDLE" || data.trigger === "DUE_DATE_APPROACHING") ? data.triggerThresholdDays ?? null : null,
      assigneeId: data.assigneeId || null,
      commentText: data.commentText || null,
      mentionUserId: data.mentionUserId || null,
      checklistTitle: data.checklistTitle || null,
      checklistItems: data.checklistItems || null,
      setDemandTypeId: data.setDemandTypeId || null,
      moveToColumnId: data.moveToColumnId || null,
      active: data.active ?? true,
      position: (maxPosition._max.position ?? -1) + 1,
    },
    include: AUTOMATION_INCLUDE,
  });

  return Response.json(automation, { status: 201 });
}
