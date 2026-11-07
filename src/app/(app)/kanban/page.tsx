import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

type Props = { searchParams: Promise<{ client?: string }> };

export default async function KanbanPage({ searchParams }: Props) {
  // ensureUrgentAlerts/runTimeBasedAutomations rodam a partir do layout
  // compartilhado (src/app/(app)/layout.tsx) agora, não só aqui - senão
  // CARD_IDLE/DUE_DATE_APPROACHING nunca disparavam pra quem só navega pela
  // Home ou por Agendamentos sem nunca abrir /kanban.
  const session = await requireModulePage("kanban");
  const { client: initialClientId } = await searchParams;

  // Demandas concluídas há mais de 3 dias e não excluídas vão para o arquivo
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  await prisma.kanbanCard.updateMany({
    where: { archivedAt: null, completedAt: { not: null, lte: threeDaysAgo } },
    data: { archivedAt: new Date() },
  });

  const [boards, columns, archivedCards, clients, projects, users, demandTypes] = await Promise.all([
    prisma.kanbanBoard.findMany({
      orderBy: { position: "asc" },
      include: { client: { select: { id: true, name: true } } },
    }),
    prisma.kanbanColumn.findMany({
      orderBy: { position: "asc" },
      include: {
        cards: {
          where: { archivedAt: null },
          orderBy: { position: "asc" },
          include: {
            client: true,
            project: true,
            assignee: { select: { id: true, name: true, avatarUrl: true } },
            post: { select: { id: true, title: true, status: true, token: true, feedback: true } },
            demandType: true,
            attachments: { orderBy: { position: "asc" } },
            comments: {
              orderBy: { createdAt: "asc" },
              include: {
                author: { select: { id: true, name: true } },
                mentionedUser: { select: { id: true, name: true } },
              },
            },
            checklists: { include: { items: true } },
          },
        },
        automations: { orderBy: { position: "asc" } },
      },
    }),
    prisma.kanbanCard.findMany({
      where: { archivedAt: { not: null } },
      orderBy: { archivedAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        demandType: true,
        column: { select: { name: true, board: { select: { name: true } } } },
      },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.demandType.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
  ]);

  const serializedBoards = boards.map((b) => ({
    id: b.id,
    name: b.name,
    position: b.position,
    client: b.client ? { id: b.client.id, name: b.client.name } : null,
  }));

  const serializedColumns = columns.map((col) => ({
    id: col.id,
    name: col.name,
    color: col.color,
    position: col.position,
    boardId: col.boardId,
    automationCount: col.automations.length,
    hasScheduleAutomation: col.automations.some(
      (a) => a.trigger === "ENTER_COLUMN" && a.action === "PROMPT_SCHEDULE" && a.active,
    ),
    cards: col.cards.map((card) => ({
      id: card.id,
      title: card.title,
      description: card.description,
      priority: card.priority,
      dueDate: card.dueDate ? card.dueDate.toISOString() : null,
      estimatedHours: card.estimatedHours,
      completedAt: card.completedAt ? card.completedAt.toISOString() : null,
      createdAt: card.createdAt.toISOString(),
      columnId: card.columnId,
      client: card.client ? { id: card.client.id, name: card.client.name, avatarUrl: card.client.avatarUrl } : null,
      project: card.project ? { id: card.project.id, name: card.project.name } : null,
      assignee: card.assignee
        ? { id: card.assignee.id, name: card.assignee.name, avatarUrl: card.assignee.avatarUrl }
        : null,
      post: card.post ? { id: card.post.id, title: card.post.title, status: card.post.status, token: card.post.token, feedback: card.post.feedback } : null,
      demandType: card.demandType ? { id: card.demandType.id, name: card.demandType.name, color: card.demandType.color } : null,
      scheduledNetwork: card.scheduledNetwork,
      scheduledAt: card.scheduledAt ? card.scheduledAt.toISOString() : null,
      publishStatus: card.publishStatus,
      attachments: card.attachments.map((a) => ({ id: a.id, url: a.url, type: a.type, name: a.name })),
      comments: card.comments.map((c) => ({
        id: c.id,
        text: c.text,
        imageUrl: c.imageUrl,
        isAutomated: c.isAutomated,
        createdAt: c.createdAt.toISOString(),
        author: c.author,
        mentionedUser: c.mentionedUser,
      })),
      checklists: card.checklists.map((cl) => ({
        id: cl.id,
        title: cl.title,
        total: cl.items.length,
        done: cl.items.filter((i) => i.done).length,
      })),
    })),
  }));

  const serializedArchived = archivedCards.map((card) => ({
    id: card.id,
    title: card.title,
    priority: card.priority,
    completedAt: card.completedAt ? card.completedAt.toISOString() : null,
    archivedAt: card.archivedAt!.toISOString(),
    client: card.client ? { id: card.client.id, name: card.client.name } : null,
    project: card.project ? { id: card.project.id, name: card.project.name } : null,
    assignee: card.assignee
      ? { id: card.assignee.id, name: card.assignee.name, avatarUrl: card.assignee.avatarUrl }
      : null,
    demandType: card.demandType
      ? { id: card.demandType.id, name: card.demandType.name, color: card.demandType.color }
      : null,
    columnName: card.column.name,
    boardName: card.column.board.name,
  }));

  return (
    <KanbanBoard
      initialBoards={serializedBoards}
      initialColumns={serializedColumns}
      initialArchived={serializedArchived}
      clients={clients.map((c) => ({ id: c.id, name: c.name, avatarUrl: c.avatarUrl }))}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      users={users.map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl }))}
      initialDemandTypes={demandTypes.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
      initialClientId={initialClientId}
      currentUserId={session.user.id}
    />
  );
}
