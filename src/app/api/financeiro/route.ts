import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { transactionSchema } from "@/lib/schemas";
import { ensureRecurringTransactions } from "@/lib/recurrence";
import { logActivity } from "@/lib/activityLog";
import { formatCurrency } from "@/lib/format";

export async function GET() {
  const { error } = await requireModule("financeiro");
  if (error) return error;

  try {
    await ensureRecurringTransactions();
  } catch (e) {
    console.error("[recurrence] falha ao gerar transações recorrentes:", e);
  }

  const transactions = await prisma.transaction.findMany({
    orderBy: { dueDate: "desc" },
    include: { client: true, service: true, teamMember: true },
  });
  return Response.json(transactions);
}

export async function POST(request: Request) {
  const { session, error } = await requireModule("financeiro");
  if (error) return error;

  const body = await request.json();
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const transaction = await prisma.transaction.create({
    data: {
      type: data.type,
      amount: data.amount,
      description: data.description,
      dueDate: new Date(data.dueDate),
      paidDate: data.paidDate ? new Date(data.paidDate) : null,
      status: data.status,
      source: "MANUAL",
      category: data.type === "EXPENSE" ? data.category || null : null,
      clientId: data.clientId || null,
      serviceId: data.serviceId || null,
      teamMemberId: data.teamMemberId || null,
    },
    include: { client: true, service: true, teamMember: true },
  });

  await logActivity({
    action: "create",
    entityType: "Transaction",
    entityId: transaction.id,
    summary: `Lançamento "${transaction.description}" (${formatCurrency(transaction.amount)}) criado`,
    userId: session!.user.id,
  });

  return Response.json(transaction, { status: 201 });
}
