import { prisma } from "@/lib/prisma";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/labels";

function monthRange(monthsFromNow: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthsFromNow, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthsFromNow + 1, 1);
  return { start, end };
}

/** Mesmo formato de chave usado em ensureRecurringTransactions (src/lib/recurrence.ts). */
function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type DreMonth = {
  label: string;
  isProjection: boolean;
  income: number;
  expenseByCategory: { category: string; amount: number }[];
  totalExpense: number;
  result: number;
};

/** Soma um lote de transações num DreMonth "real" (não-projeção), agrupando despesa por categoria. */
function summarizeRealMonth(label: string, transactions: { type: string; amount: number; category: string | null }[]): DreMonth {
  const income = transactions.filter((t) => t.type === "INCOME").reduce((sum, t) => sum + t.amount, 0);
  const expenseMap = new Map<string, number>();
  for (const t of transactions.filter((t) => t.type === "EXPENSE")) {
    const key = t.category ? EXPENSE_CATEGORY_LABELS[t.category as keyof typeof EXPENSE_CATEGORY_LABELS] : "Sem categoria";
    expenseMap.set(key, (expenseMap.get(key) ?? 0) + t.amount);
  }
  const expenseByCategory = Array.from(expenseMap.entries()).map(([category, amount]) => ({ category, amount }));
  const totalExpense = expenseByCategory.reduce((sum, e) => sum + e.amount, 0);
  return { label, isProjection: false, income, expenseByCategory, totalExpense, result: income - totalExpense };
}

/**
 * DRE simples: meses passados E o mês corrente vêm de lançamento real
 * (agrupado por categoria) - o mês corrente já tem os lançamentos
 * recorrentes materializados por ensureRecurringTransactions() na hora que
 * o Financeiro é aberto, então recalcular do cadastro em vez de usar o
 * lançamento de verdade divergia sempre que o valor mudava, o cliente era
 * inativado no meio do mês, ou o lançamento já tinha sido editado/pago.
 * Só meses FUTUROS (ainda sem recorrência materializada) são projeção de
 * verdade (mensalidade de cliente ativo + pagamento fixo de equipe ativa,
 * no mesmo cálculo que a recorrência real usa - nunca grava nada, só soma)
 * somada ao que já foi lançado manualmente pra aquele mês.
 */
export async function computeCashFlowProjection(monthsBack = 3, monthsForward = 3): Promise<DreMonth[]> {
  const months: DreMonth[] = [];

  for (let i = -monthsBack; i <= 0; i++) {
    const { start, end } = monthRange(i);
    const transactions = await prisma.transaction.findMany({
      where: { dueDate: { gte: start, lt: end }, status: { not: "CANCELED" } },
      select: { type: true, amount: true, category: true },
    });
    months.push(summarizeRealMonth(MONTH_LABELS[start.getMonth()], transactions));
  }

  const [activeClients, activeTeamMembers, skipped] = await Promise.all([
    prisma.client.findMany({ where: { status: "ACTIVE", monthlyValue: { gt: 0 } }, select: { id: true, monthlyValue: true } }),
    prisma.teamMember.findMany({ where: { active: true, paymentType: "FIXED_MONTHLY" }, select: { id: true, monthlyValue: true } }),
    prisma.recurringTransactionSkip.findMany({ select: { recurrenceKey: true } }),
  ]);
  const skippedKeys = new Set(skipped.map((s) => s.recurrenceKey));
  const folhaLabel = EXPENSE_CATEGORY_LABELS.FOLHA;

  for (let i = 1; i < monthsForward; i++) {
    const { start, end } = monthRange(i);
    const key = monthKey(start);
    // Cliente/equipe com a recorrência daquele mês explicitamente pulada
    // (RecurringTransactionSkip, gravado quando alguém exclui o lançamento
    // recorrente pelo Financeiro) não entra na projeção - sem isso a
    // projeção mostrava receita/despesa "fantasma" que o time já cancelou.
    const projectedRecurringIncome = activeClients
      .filter((c) => !skippedKeys.has(`client:${c.id}:${key}`))
      .reduce((sum, c) => sum + c.monthlyValue, 0);
    const projectedRecurringExpense = activeTeamMembers
      .filter((m) => !skippedKeys.has(`team:${m.id}:${key}`))
      .reduce((sum, m) => sum + (m.monthlyValue ?? 0), 0);

    // Só soma o que já foi lançado manualmente (não-recorrente) pra esse mês
    // futuro - o que é recorrência já está na projeção calculada acima, sem
    // isso contaria duas vezes.
    const manualFuture = await prisma.transaction.findMany({
      where: { dueDate: { gte: start, lt: end }, status: { not: "CANCELED" }, source: { not: "RECURRING" } },
      select: { type: true, amount: true, category: true },
    });
    const manualIncome = manualFuture.filter((t) => t.type === "INCOME").reduce((sum, t) => sum + t.amount, 0);
    const manualExpenseMap = new Map<string, number>();
    for (const t of manualFuture.filter((t) => t.type === "EXPENSE")) {
      const key = t.category ? EXPENSE_CATEGORY_LABELS[t.category] : "Sem categoria";
      manualExpenseMap.set(key, (manualExpenseMap.get(key) ?? 0) + t.amount);
    }
    if (projectedRecurringExpense > 0) {
      manualExpenseMap.set(folhaLabel, (manualExpenseMap.get(folhaLabel) ?? 0) + projectedRecurringExpense);
    }

    const income = manualIncome + projectedRecurringIncome;
    const expenseByCategory = Array.from(manualExpenseMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .filter((e) => e.amount > 0);
    const totalExpense = expenseByCategory.reduce((sum, e) => sum + e.amount, 0);

    months.push({
      label: `${MONTH_LABELS[start.getMonth()]} (projetado)`,
      isProjection: true,
      income,
      expenseByCategory,
      totalExpense,
      result: income - totalExpense,
    });
  }

  return months;
}
