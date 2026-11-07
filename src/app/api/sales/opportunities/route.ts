import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { salesOpportunitySchema } from "@/lib/schemas";
import { resolveClosedAt } from "@/lib/salesClosedAt";

export async function GET() {
  const { error } = await requireModule("crm");
  if (error) return error;

  const opportunities = await prisma.salesOpportunity.findMany({
    orderBy: { position: "asc" },
    include: { responsible: true, stage: true },
  });
  return Response.json(opportunities);
}

export async function POST(request: Request) {
  const { error } = await requireModule("crm");
  if (error) return error;

  const body = await request.json();
  const parsed = salesOpportunitySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const stage = await prisma.salesStage.findUnique({ where: { id: data.stageId } });
  if (!stage) {
    return Response.json({ error: "Etapa inválida" }, { status: 400 });
  }

  const maxPosition = await prisma.salesOpportunity.aggregate({
    where: { stageId: data.stageId },
    _max: { position: true },
  });

  const opportunity = await prisma.salesOpportunity.create({
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
      position: (maxPosition._max.position ?? -1) + 1,
      closedAt: resolveClosedAt(stage.isWon, null) ?? null,
    },
    include: { responsible: true, stage: true },
  });

  return Response.json(opportunity, { status: 201 });
}
