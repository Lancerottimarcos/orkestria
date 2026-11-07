import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const CONFIG_ID = "payment";

export async function getPaymentStatus(): Promise<{ provider: string; hasKey: boolean; hasWebhookToken: boolean; sandbox: boolean; updatedAt: Date | null }> {
  const config = await prisma.paymentConfig.findUnique({ where: { id: CONFIG_ID } });
  return {
    provider: config?.provider ?? "asaas",
    hasKey: Boolean(config?.apiKeyEnc),
    hasWebhookToken: Boolean(config?.webhookTokenEnc),
    sandbox: config?.sandbox ?? true,
    updatedAt: config?.updatedAt ?? null,
  };
}

export async function savePaymentCredentials(params: {
  provider: string;
  apiKey?: string;
  webhookToken?: string;
  sandbox: boolean;
  updatedById: string;
}) {
  await prisma.paymentConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      provider: params.provider,
      apiKeyEnc: params.apiKey ? encryptSecret(params.apiKey) : null,
      webhookTokenEnc: params.webhookToken ? encryptSecret(params.webhookToken) : null,
      sandbox: params.sandbox,
      updatedById: params.updatedById,
    },
    update: {
      provider: params.provider,
      ...(params.apiKey ? { apiKeyEnc: encryptSecret(params.apiKey) } : {}),
      ...(params.webhookToken ? { webhookTokenEnc: encryptSecret(params.webhookToken) } : {}),
      sandbox: params.sandbox,
      updatedById: params.updatedById,
    },
  });
}

/** Token de autenticação do webhook do Asaas (header `asaas-access-token`), pra validar POSTs recebidos. */
export async function getPaymentWebhookToken(): Promise<string | null> {
  const config = await prisma.paymentConfig.findUnique({ where: { id: CONFIG_ID } });
  return config?.webhookTokenEnc ? decryptSecret(config.webhookTokenEnc) : null;
}

async function getAsaasCredentials(): Promise<{ apiKey: string; baseUrl: string } | null> {
  const config = await prisma.paymentConfig.findUnique({ where: { id: CONFIG_ID } });
  if (!config?.apiKeyEnc) return null;
  return {
    apiKey: decryptSecret(config.apiKeyEnc),
    baseUrl: config.sandbox ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/v3",
  };
}

/**
 * Gera uma cobrança real (PIX/boleto/cartão via link hospedado pelo Asaas)
 * pra um Transaction existente. Cria o cliente no Asaas se ainda não existir
 * (casado por e-mail/documento), depois cria a cobrança e grava
 * externalChargeId/paymentLink de volta no Transaction.
 */
export async function createCharge(transactionId: string): Promise<{ paymentLink: string }> {
  const credentials = await getAsaasCredentials();
  if (!credentials) {
    throw new Error("Cobrança não configurada - adicione a chave de API do Asaas em Configurações → Integrações");
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { client: { select: { name: true, email: true, document: true, phone: true } } },
  });
  if (!transaction) throw new Error("Lançamento não encontrado");

  // Já existe cobrança gerada pra esse lançamento - reaproveita o link em vez
  // de criar uma segunda cobrança real no Asaas. Sem essa checagem, clicar
  // "Gerar cobrança" mais de uma vez duplicava a cobrança e sobrescrevia o
  // externalChargeId, quebrando a confirmação automática via webhook se o
  // cliente pagasse o link antigo (já enviado) depois do segundo clique.
  if (transaction.externalChargeId && transaction.paymentLink) {
    return { paymentLink: transaction.paymentLink };
  }

  if (!transaction.client?.email) throw new Error("O cliente vinculado a esse lançamento não tem e-mail cadastrado");
  if (!transaction.client.document) {
    throw new Error("O cliente vinculado a esse lançamento não tem CPF/CNPJ cadastrado - o Asaas exige esse dado pra gerar cobrança");
  }

  const headers = { access_token: credentials.apiKey, "content-type": "application/json" };

  const customerRes = await fetch(`${credentials.baseUrl}/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: transaction.client.name,
      email: transaction.client.email,
      cpfCnpj: transaction.client.document || undefined,
      phone: transaction.client.phone || undefined,
    }),
  });
  const customerData = await customerRes.json();
  // Asaas devolve erro "already exists" com o id do cliente já cadastrado - reaproveita em vez de falhar.
  const customerId: string | undefined = customerData.id ?? customerData.errors?.[0]?.customer;
  if (!customerId) {
    throw new Error(`Falha ao criar cliente no Asaas: ${customerData.errors?.[0]?.description ?? customerRes.status}`);
  }

  const paymentRes = await fetch(`${credentials.baseUrl}/payments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customer: customerId,
      billingType: "UNDEFINED", // deixa a pessoa escolher PIX/boleto/cartão na página do Asaas
      value: transaction.amount,
      dueDate: transaction.dueDate.toISOString().slice(0, 10),
      description: transaction.description,
      externalReference: transaction.id,
    }),
  });
  const paymentData = await paymentRes.json();
  if (!paymentRes.ok || !paymentData.id) {
    throw new Error(`Falha ao criar cobrança no Asaas: ${paymentData.errors?.[0]?.description ?? paymentRes.status}`);
  }

  try {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { externalChargeId: paymentData.id, paymentLink: paymentData.invoiceUrl },
    });
  } catch (err) {
    // A cobrança já foi criada de verdade no Asaas nesse ponto - se só o
    // registro local falhar, ainda devolve o link em vez de lançar erro
    // (senão a pessoa clica de novo e duplica a cobrança no Asaas).
    console.error(`Cobrança ${paymentData.id} criada no Asaas mas falhou ao salvar no Transaction ${transactionId}`, err);
  }

  return { paymentLink: paymentData.invoiceUrl };
}
