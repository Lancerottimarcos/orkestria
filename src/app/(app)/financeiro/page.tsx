import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { ensureRecurringTransactions } from "@/lib/recurrence";
import { FinanceView } from "@/components/finance/FinanceView";

export default async function FinanceiroPage() {
  await requireModulePage("financeiro");

  try {
    await ensureRecurringTransactions();
  } catch (e) {
    console.error("[recurrence] falha ao gerar transações recorrentes:", e);
  }

  const [transactions, clients, services, teamMembers] = await Promise.all([
    prisma.transaction.findMany({
      orderBy: { dueDate: "desc" },
      include: { client: true, service: true, teamMember: true },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.service.findMany({ orderBy: { name: "asc" } }),
    prisma.teamMember.findMany({ orderBy: { name: "asc" } }),
  ]);

  const serialized = transactions.map((t) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    description: t.description,
    dueDate: t.dueDate.toISOString(),
    paidDate: t.paidDate ? t.paidDate.toISOString() : null,
    status: t.status,
    source: t.source,
    category: t.category,
    client: t.client ? { id: t.client.id, name: t.client.name } : null,
    service: t.service ? { id: t.service.id, name: t.service.name } : null,
    teamMember: t.teamMember ? { id: t.teamMember.id, name: t.teamMember.name } : null,
  }));

  return (
    <FinanceView
      initialTransactions={serialized}
      clients={clients.map((c) => ({ id: c.id, name: c.name, avatarUrl: c.avatarUrl }))}
      services={services.map((s) => ({ id: s.id, name: s.name }))}
      teamMembers={teamMembers.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl }))}
    />
  );
}
