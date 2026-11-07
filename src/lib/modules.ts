export const MODULE_KEYS = [
  "financeiro",
  "desempenho",
  "kanban",
  "aprovacoes",
  "notas",
  "checklist",
  "chat",
  "whatsapp",
  "usuarios",
  "servicos",
  "projetos",
  "clientes",
  "equipe",
  "squads",
  "datas-comemorativas",
  "crm",
  "propostas",
  "ferramentas",
  "timesheet",
  "senhas",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  financeiro: "Financeiro",
  desempenho: "Desempenho",
  kanban: "Orkestra",
  aprovacoes: "Aprovação de Posts",
  notas: "Notas",
  checklist: "Checklist",
  chat: "Chat",
  whatsapp: "WhatsApp",
  usuarios: "Usuários",
  servicos: "Serviços",
  projetos: "Projetos",
  clientes: "Clientes",
  equipe: "Equipe",
  squads: "Squads",
  "datas-comemorativas": "Datas Comemorativas",
  crm: "CRM",
  propostas: "Propostas",
  ferramentas: "Ferramentas",
  timesheet: "Timesheet",
  senhas: "Senhas",
};

// Every module a MEMBER account already had access to before granular
// permissions existed, except Financeiro/Usuários (previously admin-only).
// A `null` moduleAccess column means "use this legacy default" so existing
// members never silently lose access on migration.
// "senhas" e "whatsapp" ficam de fora do padrão legado (igual financeiro/usuarios) -
// são sensíveis o bastante (credenciais / conversas privadas de cliente) pra exigir
// liberação explícita, não default-on pra toda conta MEMBER que nunca configurou módulos.
export const LEGACY_MEMBER_DEFAULT_MODULES: ModuleKey[] = MODULE_KEYS.filter(
  (key) => key !== "financeiro" && key !== "usuarios" && key !== "senhas" && key !== "whatsapp",
);

function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}

export function resolveAllowedModules(
  role: "ADMIN" | "MEMBER",
  moduleAccessJson: string | null | undefined,
): ModuleKey[] {
  if (role === "ADMIN") return [...MODULE_KEYS];
  if (moduleAccessJson == null) return LEGACY_MEMBER_DEFAULT_MODULES;
  try {
    const parsed = JSON.parse(moduleAccessJson);
    if (Array.isArray(parsed)) {
      return parsed.filter((key): key is ModuleKey => typeof key === "string" && isModuleKey(key));
    }
  } catch {
    // fall through to legacy default
  }
  return LEGACY_MEMBER_DEFAULT_MODULES;
}

export function hasModule(
  role: "ADMIN" | "MEMBER",
  moduleAccessJson: string | null | undefined,
  key: ModuleKey,
): boolean {
  if (role === "ADMIN") return true;
  return resolveAllowedModules(role, moduleAccessJson).includes(key);
}
