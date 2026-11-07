export type Option = { id: string; name: string };

/** Oportunidade com os dados usados pelo contrato - permite avisar na proposta o que falta cadastrar no CRM. */
export type OpportunityOption = Option & {
  contactName: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  address: string | null;
};

export type PaymentMethod = "PIX" | "BOLETO" | "CARD" | "TRANSFER";
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: "PIX",
  BOLETO: "Boleto",
  CARD: "Cartão de crédito",
  TRANSFER: "Transferência bancária",
};

export type ProposalKind = "QUICK" | "FULL";
export const PROPOSAL_KIND_LABELS: Record<ProposalKind, string> = {
  QUICK: "Orçamento",
  FULL: "Proposta comercial",
};

export type ProposalSummary = {
  id: string;
  title: string;
  status: string;
  kind: ProposalKind;
  validUntil: string | null;
  createdAt: string;
  token: string;
  client: Option | null;
  opportunity: Option | null;
  total: number;
};

export type BillingType = "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL" | "ONE_TIME";

export type ProposalItem = {
  id?: string;
  description: string;
  scope?: string;
  quantity: number;
  unitValue: number;
  billingType?: BillingType;
};

export type ProposalInstallment = {
  id?: string;
  dueDate: string;
  value: number;
};

export type ProposalViewsSummary = {
  count: number;
  lastViewedAt: string | null;
  maxScrollPercent: number;
};

export type ProposalDetail = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  viewsSummary: ProposalViewsSummary;
  status: string;
  kind: ProposalKind;
  proposalTemplateId: string | null;
  contactName: string | null;
  notes: string | null;
  validUntil: string | null;
  token: string;
  clientId: string | null;
  opportunityId: string | null;
  changeRequestMessage: string | null;
  items: ProposalItem[];
  paymentCondition: "CASH" | "INSTALLMENTS";
  installmentCount: number | null;
  setupFee: number | null;
  paymentMethods: PaymentMethod[];
  installments: ProposalInstallment[];
};
