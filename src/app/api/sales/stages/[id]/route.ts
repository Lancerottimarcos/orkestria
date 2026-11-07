import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { salesStageSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireModule("crm");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = salesStageSchema.partial().safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const stage = await prisma.salesStage.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.color !== undefined ? { color: data.color || null } : {}),
      ...(data.isWon !== undefined ? { isWon: data.isWon } : {}),
      ...(data.isLost !== undefined ? { isLost: data.isLost } : {}),
    },
  });

  return Response.json(stage);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireModule("crm");
  if (error) return error;

  const { id } = await params;
  const opportunityCount = await prisma.salesOpportunity.count({ where: { stageId: id } });
  if (opportunityCount > 0) {
    return Response.json(
      { error: "Mova as oportunidades desta etapa antes de excluí-la" },
      { status: 400 },
    );
  }

  await prisma.salesStage.delete({ where: { id } });
  return Response.json({ ok: true });
}
