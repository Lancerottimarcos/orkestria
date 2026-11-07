type CardStat = { completedAt: Date | string | null; dueDate: Date | string | null; estimatedHours: number | null };
type ProjectStat = { status: string; dueDate: Date | string | null; kanbanCards: CardStat[] };

export type SquadStats = {
  progress: number;
  healthScore: number;
  totalHours: number;
  daysRemaining: number | null;
  totalCards: number;
  completedCards: number;
  activeProjectsCount: number;
};

export function computeSquadStats(projects: ProjectStat[]): SquadStats {
  const allCards = projects.flatMap((p) => p.kanbanCards);
  const totalCards = allCards.length;
  const completedCards = allCards.filter((c) => c.completedAt).length;
  const progress = totalCards === 0 ? 0 : Math.round((completedCards / totalCards) * 100);

  const now = new Date();
  const overdueCards = allCards.filter(
    (c) => !c.completedAt && c.dueDate && new Date(c.dueDate) < now,
  ).length;
  const healthScore =
    totalCards === 0 ? 100 : Math.max(0, Math.round(100 - (overdueCards / totalCards) * 100));

  const totalHours = allCards.reduce((sum, c) => sum + (c.estimatedHours ?? 0), 0);

  const activeProjects = projects.filter((p) => p.status !== "DONE" && p.status !== "CANCELED");
  const upcomingDueDates = activeProjects
    .map((p) => (p.dueDate ? new Date(p.dueDate) : null))
    .filter((d): d is Date => d !== null && d >= now)
    .sort((a, b) => a.getTime() - b.getTime());
  const daysRemaining =
    upcomingDueDates.length > 0
      ? Math.ceil((upcomingDueDates[0].getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  return {
    progress,
    healthScore,
    totalHours,
    daysRemaining,
    totalCards,
    completedCards,
    activeProjectsCount: activeProjects.length,
  };
}

export function healthColor(score: number): string {
  if (score >= 75) return "var(--color-success)";
  if (score >= 40) return "#eab308";
  return "var(--color-danger)";
}
