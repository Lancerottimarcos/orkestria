import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { kanbanColumnSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const boardId = new URL(request.url).searchParams.get("boardId");
  const columns = await prisma.kanbanColumn.findMany({
    where: boardId ? { boardId } : undefined,
    orderBy: { position: "asc" },
    select: { id: true, name: true, boardId: true, position: true },
  });

  return Response.json(columns);
}

export async function POST(request: Request) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const body = await request.json();
  const parsed = kanbanColumnSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (!parsed.data.boardId) {
    return Response.json({ error: "boardId é obrigatório" }, { status: 400 });
  }

  const maxPosition = await prisma.kanbanColumn.aggregate({
    _max: { position: true },
    where: { boardId: parsed.data.boardId },
  });
  const column = await prisma.kanbanColumn.create({
    data: {
      name: parsed.data.name,
      color: parsed.data.color || null,
      boardId: parsed.data.boardId,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  return Response.json(column, { status: 201 });
}
