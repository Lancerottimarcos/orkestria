import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { resolveClosedAt } from "@/lib/salesClosedAt";

export async function POST(request: Request) {
  const { error } = await requireModule("crm");
  if (error) return error;

  const body = await request.json();
  const stages = body?.stages as { stageId: string; opportunityIds: string[] }[] | undefined;

  if (!Array.isArray(stages)) {
    return Response.json({ error: "Payload inválido" }, { status: 400 });
  }

  const allIds = stages.flatMap((s) => s.opportunityIds);
  const [existing, stageDetails] = await Promise.all([
    prisma.salesOpportunity.findMany({
      where: { id: { in: allIds } },
      select: { id: true, closedAt: true },
    }),
    prisma.salesStage.findMany({
      where: { id: { in: stages.map((s) => s.stageId) } },
      select: { id: true, isWon: true },
    }),
  ]);
  const closedAtMap = new Map(existing.map((o) => [o.id, o.closedAt]));
  const isWonMap = new Map(stageDetails.map((s) => [s.id, s.isWon]));

  await prisma.$transaction(
    stages.flatMap((stage) =>
      stage.opportunityIds.map((oppId, index) =>
        prisma.salesOpportunity.update({
          where: { id: oppId },
          data: {
            stageId: stage.stageId,
            position: index,
            closedAt: resolveClosedAt(isWonMap.get(stage.stageId) ?? false, closedAtMap.get(oppId) ?? null),
          },
        }),
      ),
    ),
  );

  return Response.json({ ok: true });
}
