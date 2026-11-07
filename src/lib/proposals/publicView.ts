import { prisma } from "@/lib/prisma";
import type { PaymentMethod } from "@/components/propostas/types";

const PUBLIC_PROPOSAL_SELECT = {
  id: true,
  title: true,
  status: true,
  kind: true,
  proposalBodyJson: true,
  proposalVariablesJson: true,
  contactName: true,
  notes: true,
  validUntil: true,
  createdAt: true,
  coverImageUrl: true,
  paymentCondition: true,
  setupFee: true,
  paymentMethods: true,
  client: { select: { name: true } },
  items: { orderBy: { position: "asc" as const }, select: { id: true, description: true, scope: true, quantity: true, unitValue: true } },
  installments: { orderBy: { position: "asc" as const }, select: { id: true, dueDate: true, value: true } },
  contractedServices: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      name: true,
      contractUrl: true,
      contractName: true,
      contractBodyJson: true,
      contractVariablesJson: true,
      signedAt: true,
      signerName: true,
      signerFont: true,
      agencySignedAt: true,
      agencySignerName: true,
    },
  },
};

/**
 * Formato consumido pela página pública da proposta (`/proposta/[token]`) -
 * usado tanto no primeiro carregamento (GET) quanto depois de decidir/assinar
 * (POST), pra nunca devolver `paymentMethods` como string crua (formato do
 * banco) onde o componente espera um array.
 */
export async function getPublicProposal(token: string) {
  const proposal = await prisma.salesProposal.findUnique({ where: { token }, select: PUBLIC_PROPOSAL_SELECT });
  if (!proposal) return null;

  return {
    ...proposal,
    paymentMethods: (proposal.paymentMethods ? proposal.paymentMethods.split(",") : []) as PaymentMethod[],
  };
}

/** Converte os Date do resultado acima pra string ISO - formato que os componentes cliente (/proposta e /contrato) esperam. */
export function serializePublicProposal(proposal: NonNullable<Awaited<ReturnType<typeof getPublicProposal>>>) {
  return {
    ...proposal,
    validUntil: proposal.validUntil ? proposal.validUntil.toISOString() : null,
    createdAt: proposal.createdAt.toISOString(),
    installments: proposal.installments.map((i) => ({ ...i, dueDate: i.dueDate.toISOString() })),
    contractedServices: proposal.contractedServices.map((s) => ({
      ...s,
      signedAt: s.signedAt ? s.signedAt.toISOString() : null,
      agencySignedAt: s.agencySignedAt ? s.agencySignedAt.toISOString() : null,
    })),
  };
}
