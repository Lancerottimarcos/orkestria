import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureRecurringTransactions } from "@/lib/recurrence";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/labels";

function monthRange(monthsAgo: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
  return { start, end };
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : 100;
  return ((current - previous) / previous) * 100;
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const PROJECT_STATUS_ORDER = ["PLANNING", "IN_PROGRESS", "REVIEW", "DONE", "CANCELED"] as const;
const CLIENT_STATUS_ORDER = ["ACTIVE", "PAUSED", "CHURNED"] as const;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const isAdmin = session.user.role === "ADMIN";
  const { start: monthStart, end: monthEnd } = monthRange(0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    activeClients,
    projectsInProgress,
    columns,
    boards,
    clientsThisMonth,
    projectsThisMonth,
    projectsByStatusRaw,
    recentNotes,
    recentChecklists,
    clientsByStatusRaw,
    upcomingDeadlines,
    pendingApprovals,
    pendingApprovalsCount,
    approvalStatusRaw,
  ] = await Promise.all([
    prisma.client.count({ where: { status: "ACTIVE" } }),
    prisma.project.count({ where: { status: "IN_PROGRESS" } }),
    prisma.kanbanColumn.findMany({
      orderBy: { position: "asc" },
      include: { _count: { select: { cards: true } } },
    }),
    prisma.kanbanBoard.findMany({
      orderBy: { position: "asc" },
      include: { client: { select: { name: true } } },
    }),
    prisma.client.count({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }),
    prisma.project.count({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }),
    prisma.project.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.note.findMany({
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { client: true, project: true },
    }),
    prisma.checklist.findMany({
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { items: true },
    }),
    prisma.client.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.project.findMany({
      where: { dueDate: { gte: today }, status: { notIn: ["DONE", "CANCELED"] } },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: { client: true },
    }),
    prisma.post.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: { select: { name: true } } },
    }),
    prisma.post.count({ where: { status: "PENDING" } }),
    prisma.post.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const notesSummary = recentNotes.map((n) => ({
    id: n.id,
    title: n.title,
    updatedAt: n.updatedAt.toISOString(),
    label: n.client?.name ?? n.project?.name ?? null,
  }));

  const checklistsSummary = recentChecklists.map((c) => ({
    id: c.id,
    title: c.title,
    total: c.items.length,
    done: c.items.filter((i) => i.done).length,
  }));

  const boardCardCounts = new Map<string, number>();
  for (const c of columns) {
    boardCardCounts.set(c.boardId, (boardCardCounts.get(c.boardId) ?? 0) + c._count.cards);
  }
  const kanbanByBoard = boards.map((b) => ({
    id: b.id,
    name: b.name,
    clientName: b.client?.name ?? null,
    count: boardCardCounts.get(b.id) ?? 0,
  }));

  const projectsByStatus = PROJECT_STATUS_ORDER.map((status) => ({
    status,
    count: projectsByStatusRaw.find((p) => p.status === status)?._count._all ?? 0,
  })).filter((p) => p.count > 0);

  const clientsByStatus = CLIENT_STATUS_ORDER.map((status) => ({
    status,
    count: clientsByStatusRaw.find((c) => c.status === status)?._count._all ?? 0,
  })).filter((c) => c.count > 0);

  const deadlinesSummary = upcomingDeadlines.map((p) => ({
    id: p.id,
    name: p.name,
    dueDate: p.dueDate!.toISOString(),
    clientName: p.client.name,
  }));

  const APPROVAL_STATUS_ORDER = ["PENDING", "APPROVED", "CHANGES_REQUESTED", "REJECTED"] as const;
  const approvalStatusBreakdown = APPROVAL_STATUS_ORDER.map((status) => ({
    status,
    count: approvalStatusRaw.find((p) => p.status === status)?._count._all ?? 0,
  })).filter((p) => p.count > 0);

  const approvalsSummary = pendingApprovals.map((p) => ({
    id: p.id,
    title: p.title,
    clientName: p.client.name,
    createdAt: p.createdAt.toISOString(),
  }));

  let financials = null;
  if (isAdmin) {
    try {
      await ensureRecurringTransactions();
    } catch (e) {
      console.error("[recurrence] falha ao gerar transações recorrentes:", e);
    }

    const [monthIncome, monthExpense, overdueTx, upcomingTx] = await Promise.all([
      prisma.transaction.aggregate({
        where: { type: "INCOME", status: { not: "CANCELED" }, dueDate: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: "EXPENSE", status: { not: "CANCELED" }, dueDate: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: {
          OR: [{ status: "OVERDUE" }, { status: "PENDING", dueDate: { lt: today } }],
        },
        orderBy: { dueDate: "asc" },
        take: 8,
        include: { client: true, teamMember: true },
      }),
      prisma.transaction.findMany({
        where: { status: "PENDING", dueDate: { gte: today } },
        orderBy: { dueDate: "asc" },
        take: 5,
        include: { client: true, teamMember: true },
      }),
    ]);

    const renewalWindow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    const renewalsRaw = await prisma.contractedService.findMany({
      where: { renewalDate: { not: null, gte: today, lte: renewalWindow } },
      orderBy: { renewalDate: "asc" },
      take: 8,
      include: { client: { select: { id: true, name: true } } },
    });
    const renewalsUpcoming = renewalsRaw.map((s) => ({
      id: s.id,
      name: s.name,
      value: s.value,
      renewalDate: s.renewalDate!.toISOString(),
      client: s.client ? { id: s.client.id, name: s.client.name } : null,
    }));

    const trendMonths = Array.from({ length: 6 }, (_, i) => 5 - i);
    const trend = await Promise.all(
      trendMonths.map(async (monthsAgo) => {
        const { start, end } = monthRange(monthsAgo);
        const [income, expense] = await Promise.all([
          prisma.transaction.aggregate({
            where: { type: "INCOME", status: { not: "CANCELED" }, dueDate: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: { type: "EXPENSE", status: { not: "CANCELED" }, dueDate: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
        ]);
        return {
          label: MONTH_LABELS[start.getMonth()],
          income: income._sum.amount ?? 0,
          expense: expense._sum.amount ?? 0,
        };
      }),
    );

    const sixMonthsAgo = monthRange(5).start;
    const clientRevenue = await prisma.transaction.groupBy({
      by: ["clientId"],
      where: {
        type: "INCOME",
        status: { not: "CANCELED" },
        clientId: { not: null },
        dueDate: { gte: sixMonthsAgo },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    });
    const topClientIds = clientRevenue.map((c) => c.clientId!).filter(Boolean);
    const topClientRecords = await prisma.client.findMany({
      where: { id: { in: topClientIds } },
      select: { id: true, name: true },
    });
    const topClients = clientRevenue.map((c) => ({
      name: topClientRecords.find((r) => r.id === c.clientId)?.name ?? "-",
      amount: c._sum.amount ?? 0,
    }));

    const expenseByCategoryRaw = await prisma.transaction.groupBy({
      by: ["category"],
      where: {
        type: "EXPENSE",
        status: { not: "CANCELED" },
        dueDate: { gte: sixMonthsAgo },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    });
    const expensesByCategory = expenseByCategoryRaw.map((e) => ({
      name: e.category ? EXPENSE_CATEGORY_LABELS[e.category] : "Sem categoria",
      amount: e._sum.amount ?? 0,
    }));

    const prevIncome = trend[4]?.income ?? 0;
    const prevExpense = trend[4]?.expense ?? 0;

    financials = {
      monthIncome: monthIncome._sum.amount ?? 0,
      monthExpense: monthExpense._sum.amount ?? 0,
      incomeTrendPct: pctChange(monthIncome._sum.amount ?? 0, prevIncome),
      expenseTrendPct: pctChange(monthExpense._sum.amount ?? 0, prevExpense),
      trend,
      topClients,
      expensesByCategory,
      overdueCount: overdueTx.length,
      overdueTotal: overdueTx.reduce((sum, t) => sum + t.amount, 0),
      renewalsUpcoming,
      overdue: overdueTx.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        dueDate: t.dueDate.toISOString(),
        label: t.client?.name ?? t.teamMember?.name ?? null,
      })),
      upcoming: upcomingTx.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        dueDate: t.dueDate.toISOString(),
        label: t.client?.name ?? t.teamMember?.name ?? null,
      })),
    };
  }

  return (
    <DashboardView
      userName={session?.user.name ?? ""}
      isAdmin={isAdmin}
      activeClients={activeClients}
      clientsThisMonth={clientsThisMonth}
      projectsInProgress={projectsInProgress}
      projectsThisMonth={projectsThisMonth}
      projectsByStatus={projectsByStatus}
      kanbanByBoard={kanbanByBoard}
      financials={financials}
      notesSummary={notesSummary}
      checklistsSummary={checklistsSummary}
      clientsByStatus={clientsByStatus}
      deadlinesSummary={deadlinesSummary}
      approvalsSummary={approvalsSummary}
      pendingApprovalsCount={pendingApprovalsCount}
      approvalStatusBreakdown={approvalStatusBreakdown}
    />
  );
}
