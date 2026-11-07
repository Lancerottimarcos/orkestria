/** Quando uma oportunidade entra numa etapa "ganha", registra a data de fechamento; ao sair, limpa. */
export function resolveClosedAt(isWon: boolean, currentClosedAt: Date | null): Date | null | undefined {
  if (isWon) return currentClosedAt ?? new Date();
  return currentClosedAt ? null : undefined;
}
