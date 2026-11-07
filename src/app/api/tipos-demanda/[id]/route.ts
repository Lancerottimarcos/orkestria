import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { demandTypeSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = demandTypeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const type = await prisma.demandType.update({
    where: { id },
    data: { name: parsed.data.name, color: parsed.data.color },
  });

  return Response.json(type);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;

  // ColumnAutomation.triggerDemandTypeId/setDemandTypeId são onDelete:
  // Cascade - apagar o tipo aqui apagaria silenciosamente qualquer power-up
  // que dependa dele. Bloqueia em vez disso.
  const automationCount = await prisma.columnAutomation.count({
    where: { OR: [{ triggerDemandTypeId: id }, { setDemandTypeId: id }] },
  });
  if (automationCount > 0) {
    return Response.json(
      { error: `Esse tipo é usado em ${automationCount} power-up(s) de automação - remova ou reconfigure eles antes de excluir o tipo.` },
      { status: 400 },
    );
  }

  await prisma.demandType.delete({ where: { id } });
  return Response.json({ ok: true });
}
