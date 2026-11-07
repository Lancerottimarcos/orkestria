import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { renderContractPdf } from "@/lib/contracts/renderContractPdf";
import { resolveVariables } from "@/lib/contracts/variables";
import { saveUploadedFile, normalizeFileName } from "@/lib/fileStorage";
import { getOrCreateCompanySettings } from "@/lib/company";
import { instantiateBoardFromTemplate } from "@/lib/boardTemplates";
import { ensureUniqueSlug } from "@/lib/slug";
import { logActivity } from "@/lib/activityLog";

const PROPOSAL_RESULT_SELECT = {
  id: true,
  title: true,
  status: true,
  contactName: true,
  notes: true,
  validUntil: true,
  token: true,
  createdAt: true,
  acceptedAt: true,
  signerName: true,
  changeRequestedAt: true,
  changeRequestMessage: true,
  paymentCondition: true,
  installmentCount: true,
  setupFee: true,
  paymentMethods: true,
  clientId: true,
  client: { select: { id: true, name: true, status: true } },
  items: { orderBy: { position: "asc" as const } },
  installments: { orderBy: { position: "asc" as const } },
  contractedServices: { orderBy: { createdAt: "asc" as const } },
};

async function refetch(proposalId: string) {
  return prisma.salesProposal.findUnique({ where: { id: proposalId }, select: PROPOSAL_RESULT_SELECT });
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

type DecisionAction = "accept" | "reject" | "request_changes";
type DecisionPayload = { signerName?: string; message?: string };

/**
 * Ponto único de mutação do status de uma proposta - chamado tanto pela
 * rota pública (/api/proposta/[token]) quanto pela rota interna
 * (/api/propostas/[id]/decisao), pra nunca haver um segundo caminho que
 * contorne os efeitos colaterais do aceite (criação de cliente + contratos).
 */
export async function decideProposal(proposalId: string, action: DecisionAction, payload: DecisionPayload = {}) {
  const proposal = await prisma.salesProposal.findUnique({
    where: { id: proposalId },
    include: { items: true, opportunity: true, client: true },
  });
  if (!proposal) return { error: "not_found" as const };

  if (action === "accept" && proposal.validUntil && proposal.validUntil < new Date()) {
    return { error: "expired" as const };
  }

  if (action !== "accept") {
    const guard = await prisma.salesProposal.updateMany({
      where: { id: proposalId, status: { notIn: ["ACCEPTED", "REJECTED"] } },
      data:
        action === "reject"
          ? { status: "REJECTED" }
          : { status: "CHANGES_REQUESTED", changeRequestedAt: new Date(), changeRequestMessage: payload.message || null },
    });
    // Maior evento "dinheiro se movendo" do funil de vendas não deixava
    // nenhum rastro na trilha de auditoria (src/lib/activityLog.ts) - sem
    // userId porque esse caminho também é chamado pela rota pública
    // (cliente decidindo pelo link, sem sessão de staff).
    if (guard.count > 0) {
      await logActivity({
        action: action === "reject" ? "proposal_rejected" : "proposal_changes_requested",
        entityType: "SalesProposal",
        entityId: proposalId,
        summary:
          action === "reject"
            ? `Proposta "${proposal.title}" recusada`
            : `Alterações solicitadas na proposta "${proposal.title}"`,
      });
    }
    // Idempotente de qualquer jeito (recusar/pedir alterações de novo não
    // tem efeito colateral pra proteger) - sempre devolve o estado atual.
    return { proposal: await refetch(proposalId) };
  }

  if (proposal.status === "ACCEPTED" || proposal.status === "REJECTED") {
    // já decidida - idempotente, devolve o estado atual sem reprocessar
    return { proposal: await refetch(proposalId) };
  }

  // Resolve (sem persistir ainda) o Client - dedupe só por e-mail exato
  const existingClient = proposal.client;
  const clientInfo = {
    name: existingClient?.name ?? proposal.opportunity?.name ?? proposal.contactName ?? proposal.title,
    contactName: existingClient?.contactName ?? proposal.contactName ?? proposal.opportunity?.contactName ?? null,
    // Puxa CNPJ/CPF e endereço da oportunidade de CRM, se veio de lá - é o
    // que permite o contrato já nascer completo, sem o admin preencher nada
    // manualmente depois.
    document: existingClient?.document ?? proposal.opportunity?.document ?? null,
    address: existingClient?.address ?? proposal.opportunity?.address ?? null,
    email: existingClient?.email ?? proposal.opportunity?.email ?? null,
    phone: existingClient?.phone ?? proposal.opportunity?.phone ?? null,
  };

  const template =
    (await prisma.contractTemplate.findFirst({ where: { isDefault: true } })) ??
    (await prisma.contractTemplate.findFirst());
  const company = await getOrCreateCompanySettings();

  // Gera todos os PDFs (I/O de arquivo, pode falhar) ANTES de qualquer
  // escrita de estado - se uma geração falhar no meio, nada foi persistido
  // ainda (proposta segue SENT, sem cliente criado à toa nem serviço pela
  // metade), e a chamada pode simplesmente ser refeita do zero. Antes disso,
  // o status já virava ACCEPTED antes do loop, então uma falha no meio
  // deixava a proposta travada em ACCEPTED sem forma de reprocessar (o
  // guard de idempotência bloqueava qualquer nova tentativa).
  const preparedServices = await Promise.all(
    proposal.items.map(async (item) => {
      const serviceInfo = {
        name: item.description,
        scope: item.scope || null,
        value: item.quantity * item.unitValue,
        period: item.billingType,
        startDate: new Date(), // provisório - substituído pela data real de assinatura em signProposalContracts
        renewalDate: null as Date | null,
      };
      if (!template) return { serviceInfo, pdf: null };
      const contractContext = {
        client: clientInfo,
        company: {
          name: company.name,
          document: company.document,
          address: company.address,
          email: company.email,
          phone: company.phone,
          pixKey: company.pixKey,
        },
        service: serviceInfo,
      };
      const buffer = await renderContractPdf(template, contractContext);
      const { url } = await saveUploadedFile(buffer, "pdf");
      return {
        serviceInfo,
        // Snapshot do corpo + variáveis já resolvidas - a tela de assinatura
        // mostra o contrato inteiro (não só o PDF) a partir desses dois
        // campos, sem depender do template ainda existir/estar inalterado depois.
        pdf: {
          contractUrl: url,
          contractName: `${normalizeFileName(serviceInfo.name, "contrato")}.pdf`,
          contractBodyJson: template.bodyJson,
          contractVariablesJson: JSON.stringify(resolveVariables(contractContext)),
        },
      };
    }),
  );

  // Só agora persiste tudo de uma vez, atomicamente: guarda de status,
  // resolução/criação do cliente e os N ContractedService já com PDF pronto.
  const accepted = await prisma.$transaction(async (tx) => {
    const guard = await tx.salesProposal.updateMany({
      where: { id: proposalId, status: { notIn: ["ACCEPTED", "REJECTED"] } },
      data: { status: "ACCEPTED", acceptedAt: new Date(), signerName: payload.signerName || null },
    });
    if (guard.count === 0) return false; // corrida - outra chamada já decidiu antes desta

    let client = existingClient;
    if (!client) {
      const email = clientInfo.email;
      const byEmail = email ? await tx.client.findFirst({ where: { email } }) : null;
      if (byEmail) {
        // Mesmo e-mail não significa mesma empresa - duas oportunidades
        // diferentes podem compartilhar o e-mail de um mesmo contato. Só
        // reaproveita o Client existente quando documento ou nome também
        // batem; caso contrário cria um novo, pra não emitir o contrato da
        // segunda proposta em nome/documento da primeira.
        const sameDocument = clientInfo.document && byEmail.document ? clientInfo.document === byEmail.document : null;
        const sameName = normalizeName(byEmail.name) === normalizeName(clientInfo.name);
        const looksLikeSameCompany = sameDocument === true || (sameDocument === null && sameName);
        client = looksLikeSameCompany ? byEmail : null;
      }
    }
    if (!client) {
      client = await tx.client.create({ data: { ...clientInfo, status: "ACTIVE" } });
    } else if (client.status !== "ACTIVE") {
      client = await tx.client.update({ where: { id: client.id }, data: { status: "ACTIVE" } });
    }
    await tx.salesProposal.update({ where: { id: proposalId }, data: { clientId: client.id } });

    for (const { serviceInfo, pdf } of preparedServices) {
      await tx.contractedService.create({
        data: { ...serviceInfo, proposalId: proposal.id, clientId: client.id, ...(pdf ?? {}) },
      });
    }
    return true;
  });

  if (!accepted) {
    // já tinha sido aceita por outra chamada concorrente enquanto os PDFs
    // eram gerados - idempotente, devolve o estado (já correto) dessa outra chamada
    return { proposal: await refetch(proposalId) };
  }

  await logActivity({
    action: "proposal_accepted",
    entityType: "SalesProposal",
    entityId: proposalId,
    summary: `Proposta "${proposal.title}" aceita${payload.signerName ? ` por ${payload.signerName}` : ""}`,
  });

  return { proposal: await refetch(proposalId) };
}

type SignPayload = { signerName: string; signerDocument: string; signerFont?: string };
type PortalAccess = { url: string; email: string; password: string } | null;

/**
 * Habilita a área do cliente automaticamente na assinatura, com o mesmo
 * mecanismo já usado pro admin gerar senha de portal manualmente
 * (crypto.randomBytes + bcrypt) - devolve a senha em texto puro só nesta
 * chamada (nunca fica salva em lugar nenhum), pra mostrar uma vez na tela
 * de sucesso. Se o portal já estava habilitado, ou não há e-mail (nada pra
 * usar como login), ou o e-mail já é usado por outro cliente, não faz nada
 * - o admin sempre pode habilitar na mão depois, sem quebrar o resto do fluxo.
 */
async function provisionClientPortal(client: { id: string; name: string; email: string | null; portalEnabled: boolean }): Promise<PortalAccess> {
  if (client.portalEnabled || !client.email) return null;

  const emailTaken = await prisma.client.findFirst({ where: { portalEmail: client.email, id: { not: client.id } }, select: { id: true } });
  if (emailTaken) return null;

  const portalSlug = await ensureUniqueSlug(client.name, async (slug) => {
    const existing = await prisma.client.findUnique({ where: { portalSlug: slug } });
    return !!existing;
  });
  const plainPassword = crypto.randomBytes(9).toString("base64url");
  const portalPasswordHash = await bcrypt.hash(plainPassword, 10);

  await prisma.client.update({
    where: { id: client.id },
    data: { portalEnabled: true, portalEmail: client.email, portalSlug, portalPasswordHash },
  });

  return { url: `/p/${portalSlug}`, email: client.email, password: plainPassword };
}

/**
 * Assina todos os contratos pendentes de uma proposta ACEITA de uma vez -
 * ativa o cliente, lança o financeiro (entrada + parcelas já definidas na
 * proposta) e abre o quadro Kanban do cliente (a partir do BoardTemplate
 * padrão, ou reaproveitando um quadro já existente).
 */
export async function signProposalContracts(proposalId: string, payload: SignPayload) {
  const proposal = await prisma.salesProposal.findUnique({ where: { id: proposalId }, include: { client: true } });
  if (!proposal || proposal.status !== "ACCEPTED" || !proposal.client) {
    return { error: "not_ready" as const };
  }

  const pending = await prisma.contractedService.findMany({ where: { proposalId, signedAt: null } });
  if (pending.length === 0) {
    return { error: "already_signed" as const };
  }

  const now = new Date();
  // Guarda atômica contra corrida (duplo clique, duas abas, retry de rede) -
  // igual ao padrão já usado em decideProposal: só a chamada que realmente
  // atualiza alguma linha (count > 0) segue pra financeiro/kanban/projeto/
  // portal. Sem isso, duas chamadas concorrentes passariam ambas pelo check
  // de `pending.length` antes de qualquer uma commitar, duplicando tudo.
  const signGuard = await prisma.contractedService.updateMany({
    where: { proposalId, signedAt: null },
    data: {
      signedAt: now,
      signerName: payload.signerName,
      signerDocument: payload.signerDocument,
      signerFont: payload.signerFont || null,
      startDate: now,
    },
  });
  if (signGuard.count === 0) {
    return { error: "already_signed" as const };
  }

  // Metade do fluxo de assinatura já era logada (contra-assinatura da
  // agência, assinar-agencia/route.ts) - a assinatura original do cliente
  // (o evento legal mais relevante) não deixava nenhum rastro.
  await logActivity({
    action: "sign",
    entityType: "SalesProposal",
    entityId: proposalId,
    summary: `Contrato da proposta "${proposal.title}" assinado por ${payload.signerName}`,
  });

  let client = proposal.client;
  if (client.status !== "ACTIVE") {
    client = await prisma.client.update({ where: { id: client.id }, data: { status: "ACTIVE" } });
  }

  const portalAccess = await provisionClientPortal(client);

  // Financeiro: cronograma explícito e finito definido na proposta (Condições
  // de pagamento) - todas as transações são criadas de uma vez na assinatura.
  if (proposal.setupFee) {
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        amount: proposal.setupFee,
        description: `Entrada/Setup - ${client.name}`,
        dueDate: now,
        status: "PENDING",
        source: "CONTRACT",
        clientId: client.id,
      },
    });
  }
  const installments = await prisma.salesProposalInstallment.findMany({
    where: { proposalId: proposal.id },
    orderBy: { position: "asc" },
  });
  for (const [i, inst] of installments.entries()) {
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        amount: inst.value,
        description: installments.length > 1 ? `${proposal.title} - Parcela ${i + 1}/${installments.length}` : proposal.title,
        dueDate: inst.dueDate,
        status: "PENDING",
        source: "CONTRACT",
        clientId: client.id,
      },
    });
  }
  // Sem entrada nem parcelas cadastradas (proposta à vista sem cronograma
  // explícito) - lança o valor total dos serviços como uma transação única.
  if (!proposal.setupFee && installments.length === 0) {
    const total = pending.reduce((sum, s) => sum + s.value, 0);
    if (total > 0) {
      await prisma.transaction.create({
        data: {
          type: "INCOME",
          amount: total,
          description: proposal.title,
          dueDate: now,
          status: "PENDING",
          source: "CONTRACT",
          clientId: client.id,
        },
      });
    }
  }

  // Kanban - reaproveita board existente do cliente se já houver; senão instancia a partir do BoardTemplate padrão
  const existingBoard = await prisma.kanbanBoard.findFirst({ where: { clientId: client.id } });
  if (!existingBoard) {
    const defaultTemplate = await prisma.boardTemplate.findFirst({ where: { isDefault: true }, select: { id: true } });
    await instantiateBoardFromTemplate({ name: client.name, clientId: client.id, templateId: defaultTemplate?.id ?? null });
  }
  // se o board já existia, não duplica colunas - evita reestruturar um quadro em uso

  await prisma.project.create({ data: { name: proposal.title, clientId: client.id, status: "PLANNING" } });

  return { proposal: await refetch(proposalId), portalAccess };
}
