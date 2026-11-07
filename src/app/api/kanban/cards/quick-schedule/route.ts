import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { quickScheduleSchema } from "@/lib/schemas";
import { applyCardSchedule, type ScheduleNetwork } from "@/lib/kanbanSchedule";

const SCHEDULE_COLUMN_NAME = "Agendado";

/** Acha (ou cria) a coluna "Agendado" pra guardar demandas criadas direto pela aba Agendamentos. */
async function resolveScheduleColumnId(clientId: string): Promise<string> {
  const onClientBoard = await prisma.kanbanColumn.findFirst({
    where: { name: SCHEDULE_COLUMN_NAME, board: { clientId } },
    orderBy: { position: "asc" },
  });
  if (onClientBoard) return onClientBoard.id;

  // Só reaproveita uma coluna "Agendado" de um quadro GENÉRICO (sem cliente
  // vinculado) - nunca do quadro dedicado de outro cliente, senão o card
  // nasce misturado no quadro de um cliente errado.
  const onGenericBoard = await prisma.kanbanColumn.findFirst({
    where: { name: SCHEDULE_COLUMN_NAME, board: { clientId: null } },
    orderBy: { position: "asc" },
  });
  if (onGenericBoard) return onGenericBoard.id;

  const board =
    (await prisma.kanbanBoard.findFirst({ where: { clientId: null }, orderBy: { position: "asc" } })) ??
    (await prisma.kanbanBoard.findFirst({ where: { clientId }, orderBy: { position: "asc" } }));
  if (!board) throw new Error("Nenhum quadro de demandas encontrado - crie um quadro primeiro");

  const maxColumnPosition = await prisma.kanbanColumn.aggregate({
    where: { boardId: board.id },
    _max: { position: true },
  });
  const created = await prisma.kanbanColumn.create({
    data: { name: SCHEDULE_COLUMN_NAME, boardId: board.id, position: (maxColumnPosition._max.position ?? -1) + 1 },
  });
  return created.id;
}

/** Cria uma demanda e já agenda a publicação num só passo, sem passar pelo quadro. */
export async function POST(request: Request) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const parsed = quickScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const scheduledAt = new Date(data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    return Response.json({ error: "Data de agendamento inválida" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { id: data.clientId }, select: { id: true } });
  if (!client) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });

  let columnId: string;
  try {
    columnId = await resolveScheduleColumnId(data.clientId);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Falha ao preparar o quadro" }, { status: 500 });
  }

  const maxCardPosition = await prisma.kanbanCard.aggregate({
    where: { columnId },
    _max: { position: true },
  });

  const created = await prisma.kanbanCard.create({
    data: {
      title: data.title,
      description: data.description || null,
      columnId,
      clientId: data.clientId,
      position: (maxCardPosition._max.position ?? -1) + 1,
      attachments: {
        create: (data.attachments ?? []).map((a, i) => ({
          url: a.url,
          type: a.type,
          name: a.name || null,
          position: i,
        })),
      },
    },
  });

  const result = await applyCardSchedule(created.id, data.network as ScheduleNetwork, scheduledAt);

  // A UI de "Novo agendamento" já só deixa escolher rede conectada, mas isso
  // é filtro de client - uma chamada direta à API pode pedir uma rede sem
  // conta ativa pra esse cliente. applyCardSchedule aceita mesmo assim (vira
  // lembrete local, comportamento intencional), mas o servidor precisa ser a
  // fonte de verdade sobre isso também, não só a UI: sinaliza via 207.
  let status = result!.status === 200 ? 201 : result!.status;
  if (status === 201) {
    const connectedAccount = await prisma.socialAccount.findUnique({
      where: { clientId_platform: { clientId: data.clientId, platform: data.network as ScheduleNetwork } },
    });
    if (!connectedAccount || connectedAccount.status !== "ACTIVE") status = 207;
  }

  return Response.json(result!.card, { status });
}
