import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { ClientsView } from "@/components/clients/ClientsView";
import { computeClientHealth } from "@/lib/clientHealth";
import { resolveClientAccess } from "@/lib/clientAccess";

export default async function ClientesPage() {
  const session = await requireModulePage("clientes");
  const now = new Date();

  let visibleClientIds: string[] | null = null;
  if (session.user.role !== "ADMIN") {
    const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { clientAccess: true } });
    visibleClientIds = resolveClientAccess(session.user.role, currentUser?.clientAccess);
  }

  const [clients, postCounts, activeCards, overdueTxRaw, lastMessages] = await Promise.all([
    prisma.client.findMany({
      where: visibleClientIds ? { id: { in: visibleClientIds } } : undefined,
      orderBy: { name: "asc" },
      omit: { portalPasswordHash: true },
      include: {
        _count: { select: { projects: true } },
        projects: { select: { service: { select: { name: true } } } },
      },
    }),
    prisma.post.groupBy({ by: ["clientId", "status"], _count: { status: true } }),
    prisma.kanbanCard.findMany({
      where: { completedAt: null, archivedAt: null, clientId: { not: null } },
      select: { clientId: true, dueDate: true },
    }),
    prisma.transaction.findMany({
      where: {
        clientId: { not: null },
        OR: [{ status: "OVERDUE" }, { status: "PENDING", dueDate: { lt: now } }],
      },
      select: { clientId: true },
    }),
    prisma.chatChannel.findMany({
      where: { clientId: { not: null } },
      select: { clientId: true, messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } } },
    }),
  ]);

  const statsByClient = new Map<string, { pending: number; approved: number; changesRequested: number; rejected: number }>();
  for (const row of postCounts) {
    const entry = statsByClient.get(row.clientId) ?? { pending: 0, approved: 0, changesRequested: 0, rejected: 0 };
    if (row.status === "PENDING") entry.pending = row._count.status;
    if (row.status === "APPROVED") entry.approved = row._count.status;
    if (row.status === "CHANGES_REQUESTED") entry.changesRequested = row._count.status;
    if (row.status === "REJECTED") entry.rejected = row._count.status;
    statsByClient.set(row.clientId, entry);
  }

  const activeCardsByClient = new Map<string, { total: number; overdue: number }>();
  for (const card of activeCards) {
    const entry = activeCardsByClient.get(card.clientId!) ?? { total: 0, overdue: 0 };
    entry.total += 1;
    if (card.dueDate && card.dueDate < now) entry.overdue += 1;
    activeCardsByClient.set(card.clientId!, entry);
  }
  const overdueTxByClient = new Map<string, number>();
  for (const tx of overdueTxRaw) {
    overdueTxByClient.set(tx.clientId!, (overdueTxByClient.get(tx.clientId!) ?? 0) + 1);
  }
  const lastMessageByClient = new Map<string, Date>();
  for (const ch of lastMessages) {
    if (ch.clientId && ch.messages[0]) lastMessageByClient.set(ch.clientId, ch.messages[0].createdAt);
  }

  const serialized = clients.map(({ projects, ...client }) => {
    const postStats = statsByClient.get(client.id) ?? { pending: 0, approved: 0, changesRequested: 0, rejected: 0 };
    const cardsStat = activeCardsByClient.get(client.id) ?? { total: 0, overdue: 0 };
    const lastMessageAt = lastMessageByClient.get(client.id) ?? null;
    const health = computeClientHealth({
      activeCardsTotal: cardsStat.total,
      activeCardsOverdue: cardsStat.overdue,
      overdueTransactions: overdueTxByClient.get(client.id) ?? 0,
      postsReviewed: postStats.approved + postStats.changesRequested + postStats.rejected,
      postsRejectedOrChanges: postStats.changesRequested + postStats.rejected,
      daysSinceLastMessage: lastMessageAt ? Math.floor((now.getTime() - lastMessageAt.getTime()) / 86400000) : null,
    });

    return {
      ...client,
      startDate: client.startDate.toISOString(),
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
      passwordResetRequestedAt: client.passwordResetRequestedAt
        ? client.passwordResetRequestedAt.toISOString()
        : null,
      services: Array.from(new Set(projects.map((p) => p.service?.name).filter((n): n is string => !!n))),
      postStats,
      health,
    };
  });

  return <ClientsView initialClients={serialized} isAdmin={session.user.role === "ADMIN"} />;
}
