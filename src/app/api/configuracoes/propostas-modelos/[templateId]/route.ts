import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { proposalTemplateSchema } from "@/lib/schemas";

type Params = { params: Promise<{ templateId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { templateId } = await params;
  const template = await prisma.proposalTemplate.findUnique({ where: { id: templateId } });
  if (!template) return Response.json({ error: "Modelo não encontrado" }, { status: 404 });
  return Response.json(template);
}

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { templateId } = await params;
  const body = await request.json();
  const parsed = proposalTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.isDefault) {
    await prisma.proposalTemplate.updateMany({ where: { isDefault: true, id: { not: templateId } }, data: { isDefault: false } });
  }

  const template = await prisma.proposalTemplate.update({
    where: { id: templateId },
    data: { name: parsed.data.name, bodyJson: parsed.data.bodyJson, isDefault: parsed.data.isDefault ?? false },
  });
  return Response.json(template);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { templateId } = await params;
  await prisma.proposalTemplate.delete({ where: { id: templateId } });
  return Response.json({ ok: true });
}
