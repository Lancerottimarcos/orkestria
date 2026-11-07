import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { salesOpportunitySchema } from "@/lib/schemas";
import { resolveClosedAt } from "@/lib/salesClosedAt";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireModule("crm");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = salesOpportunitySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const current = await prisma.salesOpportunity.findUnique({ where: { id } });
  if (!current) {
    return Response.json({ error: "Oportunidade não encontrada" }, { status: 404 });
  }

  const stage = await prisma.salesStage.findUnique({ where: { id: data.stageId } });
  if (!stage) {
    return Response.json({ error: "Etapa inválida" }, { status: 400 });
  }

  const closedAt = resolveClosedAt(stage.isWon, current.closedAt);

  const opportunity = await prisma.salesOpportunity.update({
    where: { id },
    data: {
      name: data.name,
      contactName: data.contactName || null,
      email: data.email || null,
      phone: data.phone || null,
      document: data.document || null,
      address: data.address || null,
      monthlyValue: data.monthlyValue ?? null,
      setupValue: data.setupValue ?? null,
      source: data.source || null,
      notes: data.notes || null,
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
      lostReason: data.lostReason || null,
      stageId: data.stageId,
      responsibleId: data.responsibleId || null,
      closedAt,
    },
    include: { responsible: true, stage: true },
  });

  return Response.json(opportunity);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireModule("crm");
  if (error) return error;

  const { id } = await params;
  await prisma.salesOpportunity.delete({ where: { id } });
  return Response.json({ ok: true });
}
