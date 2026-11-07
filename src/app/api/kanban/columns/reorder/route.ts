import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { kanbanColumnReorderSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const body = await request.json();
  const parsed = kanbanColumnReorderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.columnIds.map((columnId, index) =>
      prisma.kanbanColumn.update({ where: { id: columnId }, data: { position: index } }),
    ),
  );

  return Response.json({ ok: true });
}
