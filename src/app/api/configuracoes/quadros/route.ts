import { prisma } from "@/lib/prisma";
import { requireAdmin, requireModule } from "@/lib/authz";
import { boardTemplateSchema } from "@/lib/schemas";

// GET fica aberto a quem tem acesso ao módulo kanban (não só admin) - o
// seletor "Novo quadro a partir de um modelo" em /kanban precisa listar os
// modelos. Criar/editar/excluir modelo continua restrito ao admin.
export async function GET() {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const templates = await prisma.boardTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    include: { columns: { orderBy: { position: "asc" }, include: { cards: { orderBy: { position: "asc" } } } } },
  });
  return Response.json(templates);
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = boardTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  if (data.isDefault) {
    await prisma.boardTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  const template = await prisma.boardTemplate.create({
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
    include: { columns: { orderBy: { position: "asc" }, include: { cards: { orderBy: { position: "asc" } } } } },
  });
  return Response.json(template);
}
