import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { salesProposalSchema } from "@/lib/schemas";
import { buildProposalSnapshot } from "@/lib/proposals/snapshot";
import { sendEmail } from "@/lib/email";
import { logActivity } from "@/lib/activityLog";

type Params = { params: Promise<{ id: string }> };

const PROPOSAL_SELECT = {
  id: true,
  title: true,
  status: true,
  kind: true,
  proposalTemplateId: true,
  contactName: true,
  notes: true,
  validUntil: true,
  token: true,
  createdAt: true,
  coverImageUrl: true,
  changeRequestMessage: true,
  clientId: true,
  opportunityId: true,
  paymentCondition: true,
  installmentCount: true,
  setupFee: true,
  paymentMethods: true,
  client: { select: { id: true, name: true } },
  opportunity: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  items: { orderBy: { position: "asc" as const }, select: { id: true, description: true, scope: true, quantity: true, unitValue: true, billingType: true } },
  installments: { orderBy: { position: "asc" as const }, select: { id: true, dueDate: true, value: true } },
  views: { orderBy: { viewedAt: "desc" as const }, select: { viewedAt: true, maxScrollPercent: true } },
};

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireModule("propostas");
  if (error) return error;

  const { id } = await params;
  const proposal = await prisma.salesProposal.findUnique({ where: { id }, select: PROPOSAL_SELECT });
  if (!proposal) return Response.json({ error: "Proposta não encontrada" }, { status: 404 });

  const { views, ...rest } = proposal;
  const viewsSummary = {
    count: views.length,
    lastViewedAt: views[0]?.viewedAt ?? null,
    maxScrollPercent: views.reduce((max, v) => Math.max(max, v.maxScrollPercent ?? 0), 0),
  };

  return Response.json({ ...rest, viewsSummary });
}

export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireModule("propostas");
  if (error) return error;

  const { id } = await params;
  const current = await prisma.salesProposal.findUnique({
    where: { id },
    select: { status: true, kind: true, proposalTemplateId: true, proposalBodyJson: true, proposalVariablesJson: true },
  });
  if (!current) return Response.json({ error: "Proposta não encontrada" }, { status: 404 });

  // Contrato já gerado pra essa proposta - itens/condições de pagamento não podem mais mudar por aqui.
  // Mudanças de status pra ACCEPTED/REJECTED/CHANGES_REQUESTED só acontecem via decideProposal
  // (rota pública ou /decisao), nunca por este PATCH - o schema já restringe "status" a DRAFT/SENT.
  if (current.status === "ACCEPTED") {
    return Response.json({ error: "Proposta já aceita - itens e condições de pagamento não podem mais ser editados" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = salesProposalSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Tipo (Orçamento/Proposta) e modelo só podem mudar em DRAFT - o front já
  // trava isso, mas o servidor confiava só nele; uma proposta já enviada não
  // pode ter o tipo trocado por baixo do cliente via chamada direta à API.
  const kind = current.status === "DRAFT" ? (data.kind ?? current.kind) : current.kind;
  const requestedTemplateId = current.status === "DRAFT" ? data.proposalTemplateId || null : current.proposalTemplateId;

  const validUntil = data.validUntil ? new Date(data.validUntil) : null;
  const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitValue, 0);
  const snapshot = await buildProposalSnapshot({
    kind,
    proposalTemplateId: requestedTemplateId,
    clientId: data.clientId || null,
    opportunityId: data.opportunityId || null,
    contactName: data.contactName || null,
    title: data.title,
    total,
    validUntil,
    paymentCondition: data.paymentCondition ?? "CASH",
    setupFee: data.setupFee ?? null,
    installmentCount: data.installmentCount ?? null,
  });
  // Se o modelo vinculado foi excluído por fora (proposalTemplateId virou
  // null via onDelete: SetNull) e por isso o snapshot novo saiu vazio,
  // preserva o corpo narrativo já congelado em vez de apagá-lo só porque a
  // pessoa salvou outro campo qualquer da proposta nesse meio-tempo.
  const proposalBodyJson = snapshot.proposalBodyJson ?? (requestedTemplateId ? null : current.proposalBodyJson);
  const proposalVariablesJson = snapshot.proposalVariablesJson ?? (requestedTemplateId ? null : current.proposalVariablesJson);

  await prisma.salesProposalItem.deleteMany({ where: { proposalId: id } });
  await prisma.salesProposalInstallment.deleteMany({ where: { proposalId: id } });

  const proposal = await prisma.salesProposal.update({
    where: { id },
    data: {
      title: data.title,
      // editar uma proposta em "pediu alterações" volta ela pra "enviada" - pronta pra reenviar no mesmo link
      status: data.status ?? (current.status === "CHANGES_REQUESTED" ? "SENT" : "DRAFT"),
      kind,
      proposalTemplateId: requestedTemplateId,
      proposalBodyJson,
      proposalVariablesJson,
      clientId: data.clientId || null,
      opportunityId: data.opportunityId || null,
      contactName: data.contactName || null,
      notes: data.notes || null,
      validUntil,
      coverImageUrl: data.coverImageUrl || null,
      paymentCondition: data.paymentCondition ?? "CASH",
      installmentCount: data.installmentCount ?? null,
      setupFee: data.setupFee ?? null,
      paymentMethods: data.paymentMethods?.length ? data.paymentMethods.join(",") : null,
      items: {
        create: data.items.map((item, index) => ({
          description: item.description,
          scope: item.scope || null,
          quantity: item.quantity,
          unitValue: item.unitValue,
          billingType: item.billingType ?? "MONTHLY",
          position: index,
        })),
      },
      installments: {
        create: (data.installments ?? []).map((inst, index) => ({
          dueDate: new Date(inst.dueDate),
          value: inst.value,
          position: index,
        })),
      },
    },
    select: PROPOSAL_SELECT,
  });

  // Notifica o cliente por e-mail só na transição real pra "enviada" (não em
  // toda edição de uma proposta que já estava enviada) - silencioso se
  // e-mail não configurado ou cliente sem e-mail, não trava o salvamento.
  if (proposal.status === "SENT" && current.status !== "SENT" && proposal.clientId) {
    const client = await prisma.client.findUnique({ where: { id: proposal.clientId }, select: { email: true } });
    if (client?.email) {
      const url = `${process.env.AUTH_URL ?? "http://localhost:3000"}/proposta/${proposal.token}`;
      sendEmail({
        to: client.email,
        subject: `Nova proposta: ${proposal.title}`,
        html: `<p>Olá! Você recebeu uma nova proposta comercial.</p><p><a href="${url}">Ver proposta</a></p>`,
      })
        .then((result) => {
          // sendEmail nunca rejeita a Promise (sempre resolve com {ok, error})
          // - sem esse check o e-mail podia falhar (não configurado, chave
          // inválida etc.) e a proposta ficava marcada "Enviada" sem o
          // cliente nunca ter recebido nada, sem nenhum sinal em lugar nenhum.
          if (!result.ok) {
            console.error(`Falha ao enviar e-mail da proposta ${proposal.id}: ${result.error}`);
            return logActivity({
              action: "email_failed",
              entityType: "SalesProposal",
              entityId: proposal.id,
              summary: `Falha ao enviar e-mail da proposta "${proposal.title}" pra ${client.email}: ${result.error}`,
              userId: session!.user.id,
            });
          }
        })
        .catch((err) => console.error(`Falha ao enviar e-mail da proposta ${proposal.id}:`, err));
    }
  }

  return Response.json(proposal);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireModule("propostas");
  if (error) return error;

  const { id } = await params;
  const proposal = await prisma.salesProposal.findUnique({
    where: { id },
    select: { status: true, _count: { select: { contractedServices: true } } },
  });
  if (!proposal) return Response.json({ error: "Proposta não encontrada" }, { status: 404 });

  // Uma proposta aceita (ou com contrato já gerado) tem link público de
  // assinatura em uso e histórico financeiro/de projeto vinculado - apagar
  // por aqui derrubaria esses links com 404 sem nenhum aviso.
  if (proposal.status === "ACCEPTED" || proposal._count.contractedServices > 0) {
    return Response.json(
      { error: "Proposta já aceita ou com contrato gerado não pode ser excluída - recuse-a em vez de apagar." },
      { status: 400 },
    );
  }

  await prisma.salesProposal.delete({ where: { id } });
  return Response.json({ ok: true });
}
