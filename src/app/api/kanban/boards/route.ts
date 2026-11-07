import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { kanbanBoardSchema } from "@/lib/schemas";
import { instantiateBoardFromTemplate } from "@/lib/boardTemplates";

export async function GET() {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const boards = await prisma.kanbanBoard.findMany({
    orderBy: { position: "asc" },
    include: { client: { select: { id: true, name: true } } },
  });

  return Response.json(
    boards.map((b) => ({
      id: b.id,
      name: b.name,
      position: b.position,
      client: b.client ? { id: b.client.id, name: b.client.name } : null,
    })),
  );
}

export async function POST(request: Request) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const body = await request.json();
  const parsed = kanbanBoardSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const created = data.templateId
    ? await instantiateBoardFromTemplate({ name: data.name, clientId: data.clientId || null, templateId: data.templateId })
    : await (async () => {
        const maxPosition = await prisma.kanbanBoard.aggregate({ _max: { position: true } });
        return prisma.kanbanBoard.create({
          data: { name: data.name, clientId: data.clientId || null, position: (maxPosition._max.position ?? -1) + 1 },
        });
      })();

  const board = await prisma.kanbanBoard.findUnique({
    where: { id: created.id },
    include: { client: { select: { id: true, name: true } } },
  });

  return Response.json(
    { id: board!.id, name: board!.name, position: board!.position, client: board!.client ? { id: board!.client.id, name: board!.client.name } : null },
    { status: 201 },
  );
}
