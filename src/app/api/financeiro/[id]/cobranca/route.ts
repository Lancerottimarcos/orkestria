import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { createCharge } from "@/lib/payment";
import { logActivity } from "@/lib/activityLog";

type Params = { params: Promise<{ id: string }> };

/** Gera (ou recupera) o link de cobrança PIX/boleto/cartão desse lançamento via Asaas. */
export async function POST(_request: Request, { params }: Params) {
  const { session, error } = await requireModule("financeiro");
  if (error) return error;

  const { id } = await params;

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    select: { type: true, status: true, clientId: true, description: true },
  });
  if (!transaction) return Response.json({ error: "Lançamento não encontrado" }, { status: 404 });
  if (transaction.type !== "INCOME") {
    return Response.json({ error: "Só é possível gerar cobrança pra uma entrada" }, { status: 400 });
  }
  if (transaction.status === "PAID" || transaction.status === "CANCELED") {
    return Response.json({ error: "Esse lançamento já está pago ou cancelado" }, { status: 400 });
  }
  if (!transaction.clientId) {
    return Response.json({ error: "Esse lançamento não está vinculado a um cliente" }, { status: 400 });
  }

  try {
    const { paymentLink } = await createCharge(id);
    await logActivity({
      action: "charge",
      entityType: "Transaction",
      entityId: id,
      summary: `Cobrança gerada pra "${transaction.description}"`,
      userId: session!.user.id,
    });
    return Response.json({ paymentLink });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Falha ao gerar cobrança" }, { status: 400 });
  }
}
