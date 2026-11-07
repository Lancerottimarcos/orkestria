import { prisma } from "@/lib/prisma";
import { getOrCreateCompanySettings } from "@/lib/company";
import { resolveProposalVariables, type ProposalVariableContext } from "@/lib/proposals/variables";

type SnapshotInput = {
  kind: "QUICK" | "FULL";
  proposalTemplateId: string | null;
  clientId: string | null;
  opportunityId: string | null;
  contactName: string | null;
  title: string;
  total: number;
  validUntil: Date | null;
  paymentCondition: "CASH" | "INSTALLMENTS";
  setupFee: number | null;
  installmentCount: number | null;
};

/**
 * Resolve o snapshot do corpo do ProposalTemplate + variáveis, pra gravar em
 * SalesProposal.proposalBodyJson/proposalVariablesJson no momento do save -
 * null quando kind=QUICK ou sem modelo escolhido. Mesmo princípio de
 * congelamento do ContractedService.contractBodyJson em pipeline.ts, mas pra
 * proposta em si - deliberadamente fora de pipeline.ts (esse arquivo cuida
 * só do aceite/assinatura e não deve mudar por causa deste recurso).
 */
export async function buildProposalSnapshot(
  input: SnapshotInput,
): Promise<{ proposalBodyJson: string | null; proposalVariablesJson: string | null }> {
  if (input.kind !== "FULL" || !input.proposalTemplateId) {
    return { proposalBodyJson: null, proposalVariablesJson: null };
  }

  const template = await prisma.proposalTemplate.findUnique({ where: { id: input.proposalTemplateId } });
  if (!template) return { proposalBodyJson: null, proposalVariablesJson: null };

  const [client, opportunity, company] = await Promise.all([
    input.clientId ? prisma.client.findUnique({ where: { id: input.clientId } }) : Promise.resolve(null),
    input.opportunityId ? prisma.salesOpportunity.findUnique({ where: { id: input.opportunityId } }) : Promise.resolve(null),
    getOrCreateCompanySettings(),
  ]);

  const clientInfo: ProposalVariableContext["client"] = client
    ? {
        name: client.name,
        contactName: client.contactName,
        document: client.document,
        address: client.address,
        email: client.email,
        phone: client.phone,
      }
    : opportunity
      ? {
          name: opportunity.name,
          contactName: opportunity.contactName,
          document: opportunity.document,
          address: opportunity.address,
          email: opportunity.email,
          phone: opportunity.phone,
        }
      : { name: input.contactName ?? input.title, contactName: input.contactName, document: null, address: null, email: null, phone: null };

  const ctx: ProposalVariableContext = {
    client: clientInfo,
    company: {
      name: company.name,
      document: company.document,
      address: company.address,
      email: company.email,
      phone: company.phone,
      pixKey: company.pixKey,
    },
    proposal: {
      title: input.title,
      total: input.total,
      validUntil: input.validUntil,
      paymentCondition: input.paymentCondition,
      setupFee: input.setupFee,
      installmentCount: input.installmentCount,
    },
  };

  return {
    proposalBodyJson: template.bodyJson,
    proposalVariablesJson: JSON.stringify(resolveProposalVariables(ctx)),
  };
}
