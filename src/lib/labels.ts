export const CLIENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  CHURNED: "Encerrado",
};

export const CLIENT_STATUS_TONE: Record<string, "success" | "muted" | "danger"> = {
  ACTIVE: "success",
  PAUSED: "muted",
  CHURNED: "danger",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planejamento",
  IN_PROGRESS: "Em andamento",
  REVIEW: "Revisão",
  DONE: "Concluído",
  CANCELED: "Cancelado",
};

export const PROJECT_STATUS_TONE: Record<string, "accent" | "success" | "muted" | "danger" | "neutral"> = {
  PLANNING: "muted",
  IN_PROGRESS: "accent",
  REVIEW: "neutral",
  DONE: "success",
  CANCELED: "danger",
};

export const TEAM_TYPE_LABELS: Record<string, string> = {
  EMPLOYEE: "Funcionário",
  PARTNER: "Parceiro",
};

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  FIXED_MONTHLY: "Mensal fixo",
  PER_PROJECT: "Por projeto",
  HOURLY: "Por hora",
};

export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  OVERDUE: "Atrasado",
  CANCELED: "Cancelado",
};

export const TRANSACTION_STATUS_TONE: Record<string, "success" | "muted" | "danger" | "accent"> = {
  PENDING: "accent",
  PAID: "success",
  OVERDUE: "danger",
  CANCELED: "muted",
};

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  MIDIA_PAGA: "Mídia paga",
  FERRAMENTAS: "Ferramentas/software",
  FOLHA: "Folha de pagamento",
  IMPOSTOS: "Impostos",
  ALUGUEL: "Aluguel/infraestrutura",
  MARKETING: "Marketing próprio",
  OUTROS: "Outros",
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#3fb56f",
  MEDIUM: "#eab308",
  HIGH: "#e14b4b",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  MEMBER: "Membro",
};

export const POST_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  CHANGES_REQUESTED: "Alterações solicitadas",
  REJECTED: "Reprovado",
};

export const POST_STATUS_COLORS: Record<string, string> = {
  PENDING: "#9a9a9a",
  APPROVED: "#3fb56f",
  CHANGES_REQUESTED: "#e14b4b",
  REJECTED: "#8a1f1f",
};

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  ACCEPTED: "Aceita",
  REJECTED: "Recusada",
  CHANGES_REQUESTED: "Pediu alterações",
};

export const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  DRAFT: "#9a9a9a",
  SENT: "#3b82f6",
  ACCEPTED: "#3fb56f",
  REJECTED: "#e14b4b",
  CHANGES_REQUESTED: "#e0a72e",
};

export const CUSTOM_FORM_FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: "Texto curto",
  TEXTAREA: "Texto longo",
  SELECT: "Seleção única (lista)",
  RADIO: "Múltipla escolha",
  CHECKBOX: "Caixas de seleção",
  DATE: "Data",
  RATING: "Avaliação (1 a 5)",
};

export const RATING_LABELS: Record<string, string> = {
  LOW: "Baixo",
  MEDIUM: "Médio",
  HIGH: "Alto",
};

export const RATING_COLORS: Record<string, string> = {
  LOW: "#e14b4b",
  MEDIUM: "#eab308",
  HIGH: "#3fb56f",
};

export const COMPETITOR_TYPE_OPTIONS = ["Direto", "Indireto", "Inspiração"];
