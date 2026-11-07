import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { transactionSchema } from "@/lib/schemas";
import { logActivity } from "@/lib/activityLog";
import { formatCurrency } from "@/lib/format";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireModule("financeiro");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      type: data.type,
      amount: data.amount,
      description: data.description,
      dueDate: new Date(data.dueDate),
      paidDate: data.paidDate ? new Date(data.paidDate) : null,
      status: data.status,
      category: data.type === "EXPENSE" ? data.category || null : null,
      clientId: data.clientId || null,
      serviceId: data.serviceId || null,
      teamMemberId: data.teamMemberId || null,
    },
    include: { client: true, service: true, teamMember: true },
  });

  await logActivity({
    action: "update",
    entityType: "Transaction",
    entityId: transaction.id,
    summary: `Lançamento "${transaction.description}" (${formatCurrency(transaction.amount)}) editado`,
    userId: session!.user.id,
  });

  return Response.json(transaction);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, error } = await requireModule("financeiro");
  if (error) return error;

  const { id } = await params;
  const transaction = await prisma.transaction.findUnique({ where: { id }, select: { recurrenceKey: true, description: true, amount: true } });
  await prisma.transaction.delete({ where: { id } });

  // Lançamento recorrente apagado de propósito - registra a chave pra
  // ensureRecurringTransactions nunca recriá-la sozinha no próximo
  // carregamento da tela (ver RecurringTransactionSkip no schema).
  if (transaction?.recurrenceKey) {
    await prisma.recurringTransactionSkip.upsert({
      where: { recurrenceKey: transaction.recurrenceKey },
      update: {},
      create: { recurrenceKey: transaction.recurrenceKey },
    });
  }

  await logActivity({
    action: "delete",
    entityType: "Transaction",
    entityId: id,
    summary: transaction ? `Lançamento "${transaction.description}" (${formatCurrency(transaction.amount)}) excluído` : "Lançamento excluído",
    userId: session!.user.id,
  });

  return Response.json({ ok: true });
}
