import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { kanbanBoardSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  const [columnCount, cardCount] = await Promise.all([
    prisma.kanbanColumn.count({ where: { boardId: id } }),
    prisma.kanbanCard.count({ where: { column: { boardId: id } } }),
  ]);
  return Response.json({ columnCount, cardCount });
}

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = kanbanBoardSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const board = await prisma.kanbanBoard.update({
    where: { id },
    data: { name: data.name, clientId: data.clientId || null },
    include: { client: { select: { id: true, name: true } } },
  });

  return Response.json({
    id: board.id,
    name: board.name,
    position: board.position,
    client: board.client ? { id: board.client.id, name: board.client.name } : null,
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  const totalBoards = await prisma.kanbanBoard.count();
  if (totalBoards <= 1) {
    return Response.json({ error: "Não é possível excluir o único quadro" }, { status: 400 });
  }

  await prisma.kanbanBoard.delete({ where: { id } });
  return Response.json({ ok: true });
}
