import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { salesProposalSchema } from "@/lib/schemas";
import { buildProposalSnapshot } from "@/lib/proposals/snapshot";

export async function GET() {
  const { error } = await requireModule("propostas");
  if (error) return error;

  const proposals = await prisma.salesProposal.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      kind: true,
      validUntil: true,
      createdAt: true,
      token: true,
      client: { select: { id: true, name: true } },
      opportunity: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      items: { select: { quantity: true, unitValue: true } },
    },
  });

  const withTotals = proposals.map((p) => ({
    ...p,
    total: p.items.reduce((sum, item) => sum + item.quantity * item.unitValue, 0),
    items: undefined,
  }));

  return Response.json(withTotals);
}

export async function POST(request: Request) {
  const { session, error } = await requireModule("propostas");
  if (error) return error;

  const body = await request.json();
  const parsed = salesProposalSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const validUntil = data.validUntil ? new Date(data.validUntil) : null;
  const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitValue, 0);
  const snapshot = await buildProposalSnapshot({
    kind: data.kind ?? "FULL",
    proposalTemplateId: data.proposalTemplateId || null,
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

  const proposal = await prisma.salesProposal.create({
    data: {
      title: data.title,
      status: data.status ?? "DRAFT",
      kind: data.kind ?? "FULL",
      proposalTemplateId: data.proposalTemplateId || null,
      proposalBodyJson: snapshot.proposalBodyJson,
      proposalVariablesJson: snapshot.proposalVariablesJson,
      clientId: data.clientId || null,
      opportunityId: data.opportunityId || null,
      contactName: data.contactName || null,
      notes: data.notes || null,
      validUntil,
      coverImageUrl: data.coverImageUrl || null,
      createdById: session!.user.id,
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
    select: { id: true },
  });

  return Response.json(proposal, { status: 201 });
}
