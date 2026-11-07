/** Mesmo espírito de squadStats.ts - um score simples (0-100) a partir de sinais que já existem no sistema. */
export type ClientHealthInput = {
  activeCardsTotal: number;
  activeCardsOverdue: number;
  overdueTransactions: number;
  postsReviewed: number;
  postsRejectedOrChanges: number;
  daysSinceLastMessage: number | null;
};

export type ClientHealth = { score: number; signals: string[] };

export function computeClientHealth(input: ClientHealthInput): ClientHealth {
  let score = 100;
  const signals: string[] = [];

  if (input.activeCardsTotal > 0 && input.activeCardsOverdue > 0) {
    const ratio = input.activeCardsOverdue / input.activeCardsTotal;
    score -= Math.round(ratio * 30);
    signals.push(`${input.activeCardsOverdue} demanda(s) atrasada(s)`);
  }

  if (input.overdueTransactions > 0) {
    score -= Math.min(30, input.overdueTransactions * 10);
    signals.push(`${input.overdueTransactions} pagamento(s) em atraso`);
  }

  if (input.postsReviewed > 0) {
    const rejectionRatio = input.postsRejectedOrChanges / input.postsReviewed;
    if (rejectionRatio > 0.3) {
      score -= Math.round(rejectionRatio * 20);
      signals.push("Taxa alta de reprovação de conteúdo");
    }
  }

  if (input.daysSinceLastMessage !== null && input.daysSinceLastMessage > 21) {
    score -= 15;
    signals.push("Sem mensagens no chat há mais de 3 semanas");
  }

  return { score: Math.max(0, Math.min(100, score)), signals };
}

export function healthColor(score: number): string {
  if (score >= 75) return "var(--color-success)";
  if (score >= 40) return "#eab308";
  return "var(--color-danger)";
}
