import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { PerformanceDashboard } from "@/components/performance/PerformanceDashboard";

export default async function DesempenhoPage() {
  await requireModulePage("desempenho");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [cards, posts, columns, timeEntries, activeCards] = await Promise.all([
    prisma.kanbanCard.findMany({
      select: {
        priority: true,
        columnId: true,
        client: { select: { name: true } },
        project: { select: { name: true } },
        demandType: { select: { name: true, color: true } },
        assignee: { select: { name: true } },
      },
    }),
    prisma.post.findMany({ select: { status: true, createdAt: true, reviewedAt: true } }),
    prisma.kanbanColumn.findMany({ orderBy: { position: "asc" } }),
    prisma.timeEntry.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      select: { minutes: true, billable: true, user: { select: { id: true, name: true } } },
    }),
    prisma.kanbanCard.findMany({
      where: { completedAt: null, archivedAt: null, assigneeId: { not: null } },
      select: { assignee: { select: { id: true, name: true } } },
    }),
  ]);

  const byColumnMap = new Map<string, { name: string; color: string; count: number }>();
  for (const col of columns) {
    const count = cards.filter((c) => c.columnId === col.id).length;
    const existing = byColumnMap.get(col.name);
    if (existing) existing.count += count;
    else byColumnMap.set(col.name, { name: col.name, color: col.color || "#6b7280", count });
  }
  const byColumn = Array.from(byColumnMap.values());

  const typeMap = new Map<string, { name: string; color: string; count: number }>();
  let noTypeCount = 0;
  for (const c of cards) {
    if (c.demandType) {
      const existing = typeMap.get(c.demandType.name);
      if (existing) existing.count++;
      else typeMap.set(c.demandType.name, { name: c.demandType.name, color: c.demandType.color, count: 1 });
    } else {
      noTypeCount++;
    }
  }
  const byType = Array.from(typeMap.values()).sort((a, b) => b.count - a.count);
  if (noTypeCount > 0) byType.push({ name: "Sem tipo", color: "#6b7280", count: noTypeCount });

  const byPriority = (["HIGH", "MEDIUM", "LOW"] as const).map((p) => ({
    priority: p,
    count: cards.filter((c) => c.priority === p).length,
  }));

  function topN(entries: (string | undefined)[], n: number) {
    const map = new Map<string, number>();
    for (const name of entries) {
      if (!name) continue;
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  }

  const byClient = topN(cards.map((c) => c.client?.name), 8);
  const byProject = topN(cards.map((c) => c.project?.name), 8);
  const byAssignee = topN(cards.map((c) => c.assignee?.name), 8);

  // Só entra na média quem tem reviewedAt depois de createdAt - um post com
  // timestamp inconsistente (ex: dado de demonstração com datas fora de
  // ordem) não pode fazer a média de tempo de aprovação virar negativa.
  const approvalDurationsHours = posts
    .filter((p) => p.reviewedAt && p.reviewedAt > p.createdAt)
    .map((p) => (p.reviewedAt!.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60));
  const avgApprovalHours =
    approvalDurationsHours.length > 0
      ? approvalDurationsHours.reduce((sum, h) => sum + h, 0) / approvalDurationsHours.length
      : null;

  const approvalStats = {
    total: posts.length,
    pending: posts.filter((p) => p.status === "PENDING").length,
    approved: posts.filter((p) => p.status === "APPROVED").length,
    changesRequested: posts.filter((p) => p.status === "CHANGES_REQUESTED").length,
    rejected: posts.filter((p) => p.status === "REJECTED").length,
    avgApprovalHours,
  };

  const capacityMap = new Map<string, { name: string; billableHours: number; totalHours: number; activeCards: number }>();
  for (const entry of timeEntries) {
    if (!entry.user) continue;
    const existing = capacityMap.get(entry.user.id) ?? { name: entry.user.name, billableHours: 0, totalHours: 0, activeCards: 0 };
    existing.totalHours += entry.minutes / 60;
    if (entry.billable) existing.billableHours += entry.minutes / 60;
    capacityMap.set(entry.user.id, existing);
  }
  for (const card of activeCards) {
    if (!card.assignee) continue;
    const existing = capacityMap.get(card.assignee.id) ?? { name: card.assignee.name, billableHours: 0, totalHours: 0, activeCards: 0 };
    existing.activeCards += 1;
    capacityMap.set(card.assignee.id, existing);
  }
  const capacityByPerson = Array.from(capacityMap.values()).sort((a, b) => b.totalHours - a.totalHours);

  return (
    <PerformanceDashboard
      totalCards={cards.length}
      byColumn={byColumn}
      byType={byType}
      byPriority={byPriority}
      byClient={byClient}
      byProject={byProject}
      byAssignee={byAssignee}
      approvalStats={approvalStats}
      capacityByPerson={capacityByPerson}
    />
  );
}
