import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { getPaymentWebhookToken } from "@/lib/payment";

const PAID_EVENTS = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);

/**
 * Webhook do Asaas - marca o Transaction como pago quando a cobrança é
 * confirmada. Autenticação: exige o token configurado em Configurações →
 * Integrações → Cobrança bater com o header `asaas-access-token` (o Asaas
 * reenvia de volta o token cadastrado no painel deles em Integrações →
 * Webhooks) - falha fechado (401) se o token não bater ou não estiver
 * configurado, mesmo padrão do webhook do WhatsApp. Sem isso, o externalReference/
 * payment.id sendo um match não é autenticação de verdade: qualquer POST
 * forjado com um payment.id válido marcaria a cobrança como paga.
 */
export async function POST(request: Request) {
  const webhookToken = await getPaymentWebhookToken();
  if (!webhookToken || request.headers.get("asaas-access-token") !== webhookToken) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.event || !body?.payment?.id) {
    return Response.json({ error: "Payload inválido" }, { status: 400 });
  }

  if (!PAID_EVENTS.has(body.event)) {
    return Response.json({ ok: true });
  }

  const transaction = await prisma.transaction.findFirst({
    where: { externalChargeId: body.payment.id },
    select: { id: true, status: true },
  });
  if (!transaction || transaction.status === "PAID") {
    return Response.json({ ok: true });
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { status: "PAID", paidDate: new Date() },
  });

  await logActivity({
    action: "update",
    entityType: "Transaction",
    entityId: transaction.id,
    summary: "Pagamento confirmado automaticamente via webhook do Asaas",
  });

  return Response.json({ ok: true });
}
