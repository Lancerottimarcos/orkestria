import { prisma } from "@/lib/prisma";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function ensureRecurringTransactions() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const key = monthKey(now);

  const [activeClients, activeTeamMembers, skipped] = await Promise.all([
    prisma.client.findMany({ where: { status: "ACTIVE" } }),
    prisma.teamMember.findMany({
      where: { active: true, paymentType: "FIXED_MONTHLY" },
    }),
    prisma.recurringTransactionSkip.findMany({ select: { recurrenceKey: true } }),
  ]);
  const skippedKeys = new Set(skipped.map((s) => s.recurrenceKey));

  await Promise.all([
    ...activeClients
      // Sem mensalidade cadastrada (ex: cliente veio do fluxo de Proposta/
      // CRM, que fatura por ContractedService, não por Client.monthlyValue)
      // - gerar um lançamento de R$ 0,00 todo mês só polui o financeiro.
      .filter((client) => client.monthlyValue > 0)
      .filter((client) => !skippedKeys.has(`client:${client.id}:${key}`))
      .map((client) => {
      const day = Math.min(Math.max(client.billingDay, 1), 28);
      return prisma.transaction.upsert({
        where: { recurrenceKey: `client:${client.id}:${key}` },
        update: {},
        create: {
          type: "INCOME",
          amount: client.monthlyValue,
          description: `Mensalidade - ${client.name}`,
          dueDate: new Date(year, month, day),
          status: "PENDING",
          source: "RECURRING",
          recurrenceKey: `client:${client.id}:${key}`,
          clientId: client.id,
        },
      });
    }),
    ...activeTeamMembers
      .filter((member) => !skippedKeys.has(`team:${member.id}:${key}`))
      .filter((member) => (member.monthlyValue ?? 0) > 0)
      .map((member) => {
        return prisma.transaction.upsert({
          where: { recurrenceKey: `team:${member.id}:${key}` },
          update: {},
          create: {
            type: "EXPENSE",
            amount: member.monthlyValue!,
            description: `Pagamento mensal - ${member.name}`,
            dueDate: new Date(year, month, 5),
            status: "PENDING",
            source: "RECURRING",
            category: "FOLHA",
            recurrenceKey: `team:${member.id}:${key}`,
            teamMemberId: member.id,
          },
        });
      }),
  ]);
}
