import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { columnAutomationSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string; automationId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id, automationId } = await params;
  const body = await request.json();

  if (typeof body?.active === "boolean" && Object.keys(body).length === 1) {
    const result = await prisma.columnAutomation.updateMany({
      where: { id: automationId, cardId: id },
      data: { active: body.active },
    });
    if (result.count === 0) return Response.json({ error: "Power-up não encontrado" }, { status: 404 });
    const automation = await prisma.columnAutomation.findUnique({ where: { id: automationId } });
    return Response.json(automation);
  }

  const parsed = columnAutomationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const result = await prisma.columnAutomation.updateMany({
    where: { id: automationId, cardId: id },
    data: {
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
    },
  });
  if (result.count === 0) return Response.json({ error: "Power-up não encontrado" }, { status: 404 });

  const automation = await prisma.columnAutomation.findUnique({ where: { id: automationId } });
  return Response.json(automation);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id, automationId } = await params;
  const result = await prisma.columnAutomation.deleteMany({ where: { id: automationId, cardId: id } });
  if (result.count === 0) return Response.json({ error: "Power-up não encontrado" }, { status: 404 });
  return Response.json({ ok: true });
}
