import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency, formatDate, PERIOD_LABELS, type ContractedServicePeriod } from "@/lib/format";

export type ContractClient = {
  name: string;
  contactName: string | null;
  document: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
};

export type ContractCompany = {
  name: string;
  document: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  pixKey: string | null;
};

export type ContractServiceInfo = {
  name: string;
  scope: string | null;
  value: number;
  period: ContractedServicePeriod;
  startDate: string | Date;
  renewalDate: string | Date | null;
};

export type ContractVariableContext = {
  client: ContractClient;
  company: ContractCompany;
  service: ContractServiceInfo;
};

type ContractVariableGroup = {
  key: string;
  label: string;
  variables: { key: string; label: string; resolve: (ctx: ContractVariableContext) => string }[];
};

export const dash = (value: string | null | undefined) => value?.trim() || "-";

/**
 * Catálogo de variáveis - fonte única tanto da barra lateral do editor
 * quanto da resolução de valores. Nunca existe token listado que o
 * resolver não sabe preencher, porque os dois vêm do mesmo array.
 */
export const CONTRACT_VARIABLE_GROUPS: ContractVariableGroup[] = [
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
    key: "servico",
    label: "Serviço contratado",
    variables: [
      { key: "servico.nome", label: "Nome do serviço", resolve: (ctx) => dash(ctx.service.name) },
      { key: "servico.escopo", label: "Escopo", resolve: (ctx) => dash(ctx.service.scope) },
      { key: "servico.valor", label: "Valor", resolve: (ctx) => formatCurrency(ctx.service.value) },
      { key: "servico.periodo", label: "Período", resolve: (ctx) => PERIOD_LABELS[ctx.service.period] },
      { key: "servico.data_inicio", label: "Data de início", resolve: (ctx) => formatDate(ctx.service.startDate) },
      {
        key: "servico.data_renovacao",
        label: "Data de renovação",
        resolve: (ctx) => (ctx.service.renewalDate ? formatDate(ctx.service.renewalDate) : "não definida"),
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
export function resolveVariables(ctx: ContractVariableContext): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const group of CONTRACT_VARIABLE_GROUPS) {
    for (const variable of group.variables) {
      resolved[variable.key] = variable.resolve(ctx);
    }
  }
  return resolved;
}
