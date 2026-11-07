import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { boardTemplateSchema } from "@/lib/schemas";

type Params = { params: Promise<{ templateId: string }> };

const TEMPLATE_INCLUDE = {
  columns: { orderBy: { position: "asc" as const }, include: { cards: { orderBy: { position: "asc" as const } } } },
};

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { templateId } = await params;
  const template = await prisma.boardTemplate.findUnique({ where: { id: templateId }, include: TEMPLATE_INCLUDE });
  if (!template) return Response.json({ error: "Modelo não encontrado" }, { status: 404 });
  return Response.json(template);
}

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { templateId } = await params;
  const body = await request.json();
  const parsed = boardTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  if (data.isDefault) {
    await prisma.boardTemplate.updateMany({ where: { isDefault: true, id: { not: templateId } }, data: { isDefault: false } });
  }

  // Substitui colunas/cards inteiros a cada save - mesmo padrão deleteMany+recria já usado nos itens de proposta.
  await prisma.boardTemplateColumn.deleteMany({ where: { templateId } });

  const template = await prisma.boardTemplate.update({
    where: { id: templateId },
    data: {
      name: data.name,
      description: data.description || null,
      isDefault: data.isDefault ?? false,
      columns: {
        create: (data.columns ?? []).map((col, index) => ({
          name: col.name,
          color: col.color || null,
          position: index,
          cards: { create: (col.cards ?? []).map((card, cardIndex) => ({ title: card.title, position: cardIndex })) },
        })),
      },
    },
    include: TEMPLATE_INCLUDE,
  });

  return Response.json(template);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { templateId } = await params;
  await prisma.boardTemplate.delete({ where: { id: templateId } });
  return Response.json({ ok: true });
}
