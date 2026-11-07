import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency, formatDate } from "@/lib/format";
import { dash, type ContractClient, type ContractCompany } from "@/lib/contracts/variables";

export type ProposalInfo = {
  title: string;
  total: number;
  validUntil: string | Date | null;
  paymentCondition: "CASH" | "INSTALLMENTS";
  setupFee: number | null;
  installmentCount: number | null;
};

export type ProposalVariableContext = {
  client: ContractClient;
  company: ContractCompany;
  proposal: ProposalInfo;
};

type ProposalVariableGroup = {
  key: string;
  label: string;
  variables: { key: string; label: string; resolve: (ctx: ProposalVariableContext) => string }[];
};

/**
 * Catálogo de variáveis da proposta comercial - mesmo espírito de
 * CONTRACT_VARIABLE_GROUPS (fonte única pro editor e pro resolver), mas em
 * arquivo próprio: o contexto de uma proposta agrega N itens + condição de
 * pagamento, não um único ContractedService, então não compartilha o mesmo
 * shape de contexto do catálogo de contratos. As chaves "contratante" e
 * "contratada" são mantidas idênticas às do contrato de propósito - mesmo
 * vocabulário pra quem já usa o editor de contrato - com resolvers próprios.
 */
export const PROPOSTA_VARIABLE_GROUPS: ProposalVariableGroup[] = [
  {
    key: "contratante",
    label: "Contratante (cliente)",
    variables: [
      { key: "contratante.razao_social", label: "Razão social", resolve: (ctx) => dash(ctx.client.name) },
      { key: "contratante.nome_contato", label: "Nome do contato", resolve: (ctx) => dash(ctx.client.contactName) },
      { key: "contratante.documento", label: "CNPJ/CPF", resolve: (ctx) => dash(ctx.client.document) },
      { key: "contratante.endereco", label: "Endereço", resolve: (ctx) => dash(ctx.client.address) },
      { key: "contratante.email", label: "Email", resolve: (ctx) => dash(ctx.client.email) },
      { key: "contratante.telefone", label: "Telefone", resolve: (ctx) => dash(ctx.client.phone) },
    ],
  },
  {
    key: "contratada",
    label: "Contratada (sua agência)",
    variables: [
      { key: "contratada.razao_social", label: "Razão social", resolve: (ctx) => dash(ctx.company.name) },
      { key: "contratada.documento", label: "CNPJ", resolve: (ctx) => dash(ctx.company.document) },
      { key: "contratada.endereco", label: "Endereço", resolve: (ctx) => dash(ctx.company.address) },
      { key: "contratada.email", label: "Email", resolve: (ctx) => dash(ctx.company.email) },
      { key: "contratada.telefone", label: "Telefone", resolve: (ctx) => dash(ctx.company.phone) },
      { key: "contratada.pix", label: "Chave PIX", resolve: (ctx) => dash(ctx.company.pixKey) },
    ],
  },
  {
    key: "proposta",
    label: "Proposta",
    variables: [
      { key: "proposta.titulo", label: "Título da proposta", resolve: (ctx) => dash(ctx.proposal.title) },
      { key: "proposta.valor_total", label: "Valor total", resolve: (ctx) => formatCurrency(ctx.proposal.total) },
      {
        key: "proposta.condicao_pagamento",
        label: "Condição de pagamento",
        resolve: (ctx) =>
          ctx.proposal.paymentCondition === "INSTALLMENTS"
            ? `${ctx.proposal.installmentCount ?? "-"}x`
            : "À vista",
      },
      {
        key: "proposta.entrada",
        label: "Entrada/Setup",
        resolve: (ctx) => (ctx.proposal.setupFee ? formatCurrency(ctx.proposal.setupFee) : "sem entrada"),
      },
      {
        key: "proposta.validade",
        label: "Válida até",
        resolve: (ctx) => (ctx.proposal.validUntil ? formatDate(ctx.proposal.validUntil) : "sem prazo definido"),
      },
    ],
  },
  {
    key: "data",
    label: "Data",
    variables: [
      {
        key: "data.hoje",
        label: "Data de hoje",
        resolve: () => format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR }),
      },
    ],
  },
];

/** Devolve um mapa { "contratante.razao_social": "Cliente XPTO Ltda", ... } com todas as variáveis já resolvidas. */
export function resolveProposalVariables(ctx: ProposalVariableContext): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const group of PROPOSTA_VARIABLE_GROUPS) {
    for (const variable of group.variables) {
      resolved[variable.key] = variable.resolve(ctx);
    }
  }
  return resolved;
}
