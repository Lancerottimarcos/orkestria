import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { kanbanColumnSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = kanbanColumnSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const column = await prisma.kanbanColumn.update({
    where: { id },
    data: { name: parsed.data.name, color: parsed.data.color || null },
  });

  return Response.json(column);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  await prisma.kanbanColumn.delete({ where: { id } });
  return Response.json({ ok: true });
}
