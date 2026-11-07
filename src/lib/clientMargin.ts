import { prisma } from "@/lib/prisma";

// Não existe vínculo direto entre User (quem aponta hora) e TeamMember (quem
// tem valor/hora cadastrado) - o schema só liga os dois por e-mail em comum,
// numa correspondência melhor-esforço (ver nota em squadStats sobre a mesma
// limitação de modelagem). Quando não bate, a hora entra na contagem mas o
// custo fica de fora - reportado como "sem valor cadastrado", nunca estimado.
const STANDARD_MONTHLY_HOURS = 160; // 8h x 20 dias úteis - só usado pra converter salário mensal em custo/hora

export type ClientMarginPerson = { name: string; hours: number; cost: number; matched: boolean };

export type ClientMargin = {
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number | null;
  totalBillableHours: number;
  unmatchedHours: number;
  byPerson: ClientMarginPerson[];
};

/** Margem de um cliente no período: mensalidade (receita) vs. custo alocado (hora faturável x valor/hora de quem apontou). */
export async function computeClientMargin(clientId: string, monthsBack = 1): Promise<ClientMargin> {
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - monthsBack * 30);

  const [client, entries, teamMembers] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, select: { monthlyValue: true } }),
    prisma.timeEntry.findMany({
      where: { billable: true, date: { gte: periodStart }, card: { clientId } },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.teamMember.findMany({
      where: { active: true, email: { not: null }, monthlyValue: { not: null } },
      select: { email: true, paymentType: true, monthlyValue: true },
    }),
  ]);

  const rateByEmail = new Map(
    teamMembers.map((m) => [
      m.email!.toLowerCase(),
      m.paymentType === "HOURLY" ? m.monthlyValue! : m.monthlyValue! / STANDARD_MONTHLY_HOURS,
    ]),
  );

  let cost = 0;
  let unmatchedMinutes = 0;
  const byPersonMap = new Map<string, ClientMarginPerson>();

  for (const entry of entries) {
    const hours = entry.minutes / 60;
    const rate = entry.user?.email ? rateByEmail.get(entry.user.email.toLowerCase()) : undefined;
    const entryCost = rate != null ? hours * rate : 0;
    if (rate != null) cost += entryCost;
    else unmatchedMinutes += entry.minutes;

    const key = entry.user?.id ?? "unknown";
    const existing = byPersonMap.get(key) ?? { name: entry.user?.name ?? "Sem responsável", hours: 0, cost: 0, matched: rate != null };
    existing.hours += hours;
    existing.cost += entryCost;
    byPersonMap.set(key, existing);
  }

  const revenue = (client?.monthlyValue ?? 0) * monthsBack;
  const margin = revenue - cost;

  return {
    revenue,
    cost,
    margin,
    marginPct: revenue > 0 ? (margin / revenue) * 100 : null,
    totalBillableHours: entries.reduce((sum, e) => sum + e.minutes, 0) / 60,
    unmatchedHours: unmatchedMinutes / 60,
    byPerson: Array.from(byPersonMap.values()).sort((a, b) => b.cost - a.cost),
  };
}
