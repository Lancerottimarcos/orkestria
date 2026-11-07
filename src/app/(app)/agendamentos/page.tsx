import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { ScheduledContentView } from "@/components/kanban/ScheduledContentView";

export default async function AgendamentosPage() {
  // Reaproveita a permissão do módulo Demandas: o conteúdo agendado é
  // formado pelas próprias demandas do quadro que passaram pelo power-up
  // de agendamento.
  await requireModulePage("kanban");

  const cards = await prisma.kanbanCard.findMany({
    where: { scheduledAt: { not: null }, archivedAt: null },
    orderBy: { scheduledAt: "asc" },
    include: {
      client: { select: { id: true, name: true, avatarUrl: true } },
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      demandType: true,
      attachments: { orderBy: { position: "asc" }, take: 1 },
      column: { select: { name: true, board: { select: { name: true } } } },
    },
  });

  const serializedCards = cards
    .filter((c) => c.scheduledNetwork && c.scheduledAt)
    .map((card) => ({
      id: card.id,
      title: card.title,
      description: card.description,
      scheduledNetwork: card.scheduledNetwork!,
      scheduledAt: card.scheduledAt!.toISOString(),
      publishStatus: card.publishStatus,
      coverUrl: card.attachments[0]?.url ?? null,
      client: card.client ? { id: card.client.id, name: card.client.name, avatarUrl: card.client.avatarUrl } : null,
      project: card.project ? { id: card.project.id, name: card.project.name } : null,
      assignee: card.assignee
        ? { id: card.assignee.id, name: card.assignee.name, avatarUrl: card.assignee.avatarUrl }
        : null,
      demandType: card.demandType
        ? { id: card.demandType.id, name: card.demandType.name, color: card.demandType.color }
        : null,
      attachments: card.attachments.map((a) => ({ id: a.id, url: a.url, type: a.type, name: a.name })),
      columnName: card.column.name,
      boardName: card.column.board.name,
    }));

  return <ScheduledContentView initialCards={serializedCards} />;
}
