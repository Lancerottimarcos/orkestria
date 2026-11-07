import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().email("Informe um email válido"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const clientSchema = z.object({
  name: z.string().min(2, "Informe o nome do cliente"),
  contactName: z.string().optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  document: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  monthlyValue: z.coerce.number().min(0, "Valor não pode ser negativo"),
  billingDay: z.coerce.number().int().min(1).max(28),
  status: z.enum(["ACTIVE", "PAUSED", "CHURNED"]),
  startDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  avatarUrl: z.string().optional().or(z.literal("")),
  coverUrl: z.string().optional().or(z.literal("")),
  coverColor: z.string().optional().or(z.literal("")),
  icon: z.string().optional().or(z.literal("")),
  portalEnabled: z.coerce.boolean().optional(),
  portalEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  portalSlug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen")
    .optional()
    .or(z.literal("")),
});
export type ClientInput = z.infer<typeof clientSchema>;
export type ClientFormValues = z.input<typeof clientSchema>;

export const clientPortalUserSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  role: z.string().optional().or(z.literal("")),
  email: z.string().email("Email inválido"),
});
export type ClientPortalUserInput = z.infer<typeof clientPortalUserSchema>;

export const serviceSchema = z.object({
  name: z.string().min(2, "Informe o nome do serviço"),
  description: z.string().optional().or(z.literal("")),
  defaultPrice: z.coerce.number().min(0, "Valor não pode ser negativo"),
  category: z.string().optional().or(z.literal("")),
  coverColor: z.string().optional().or(z.literal("")),
});
export type ServiceInput = z.infer<typeof serviceSchema>;
export type ServiceFormValues = z.input<typeof serviceSchema>;

export const projectSchema = z.object({
  name: z.string().min(2, "Informe o nome do projeto"),
  description: z.string().optional().or(z.literal("")),
  status: z.enum(["PLANNING", "IN_PROGRESS", "REVIEW", "DONE", "CANCELED"]),
  clientId: z.string().min(1, "Selecione um cliente"),
  serviceId: z.string().optional().or(z.literal("")),
  value: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  startDate: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  squadId: z.string().optional().or(z.literal("")),
  coverColor: z.string().optional().or(z.literal("")),
});
export type ProjectInput = z.infer<typeof projectSchema>;
export type ProjectFormValues = z.input<typeof projectSchema>;

export const teamMemberSchema = z.object({
  name: z.string().min(2, "Informe o nome"),
  type: z.enum(["EMPLOYEE", "PARTNER"]),
  role: z.string().optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  paymentType: z.enum(["FIXED_MONTHLY", "PER_PROJECT", "HOURLY"]),
  monthlyValue: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  active: z.coerce.boolean().optional(),
  avatarUrl: z.string().optional().or(z.literal("")),
});
export type TeamMemberInput = z.infer<typeof teamMemberSchema>;
export type TeamMemberFormValues = z.input<typeof teamMemberSchema>;

export const squadSchema = z.object({
  name: z.string().min(2, "Informe o nome do squad"),
  description: z.string().optional().or(z.literal("")),
  avatarUrl: z.string().optional().or(z.literal("")),
  color: z.string().optional().or(z.literal("")),
  icon: z.string().optional().or(z.literal("")),
  leadId: z.string().optional().or(z.literal("")),
  memberIds: z.array(z.string()).optional(),
});
export type SquadInput = z.infer<typeof squadSchema>;

// Mesmas 5 regras exibidas no indicador de força (src/components/ui/PasswordStrength.tsx)
// - se muda de um lado, muda do outro, senão o servidor rejeita o que o
// cliente mostrou como "Ótima".
export const strongPasswordSchema = z
  .string()
  .min(8, "Mínimo de 8 caracteres")
  .regex(/\d/, "Deve conter pelo menos 1 número")
  .regex(/[A-Z]/, "Deve conter pelo menos 1 letra maiúscula")
  .regex(/[a-z]/, "Deve conter pelo menos 1 letra minúscula")
  .regex(/[^A-Za-z0-9]/, "Deve conter pelo menos 1 caractere especial")
  .optional()
  .or(z.literal(""));

export const userSchema = z.object({
  name: z.string().min(2, "Informe o nome"),
  email: z.string().email("Email inválido"),
  password: strongPasswordSchema,
  role: z.enum(["ADMIN", "MEMBER"]),
  setor: z.string().optional().or(z.literal("")),
  cargo: z.string().optional().or(z.literal("")),
  active: z.coerce.boolean().optional(),
  modules: z.array(z.string()).optional(),
  /** null/undefined = sem restrição de cliente (vê todos); array vazio = não vê nenhum. */
  clients: z.array(z.string()).nullable().optional(),
  avatarUrl: z.string().optional().or(z.literal("")),
});
export type UserInput = z.infer<typeof userSchema>;
export type UserFormValues = z.input<typeof userSchema>;

export const meSchema = z.object({
  name: z.string().min(2, "Informe o nome"),
  email: z.string().email("Email inválido"),
  currentPassword: z.string().optional().or(z.literal("")),
  newPassword: strongPasswordSchema,
  avatarUrl: z.string().optional().or(z.literal("")),
});
export type MeInput = z.infer<typeof meSchema>;

export const companySettingsSchema = z.object({
  name: z.string().min(1, "Informe o nome da empresa"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  document: z.string().optional().or(z.literal("")),
  pixKey: z.string().optional().or(z.literal("")),
  logoUrl: z.string().optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use um código de cor hexadecimal (ex: #ff9f1c)").optional().or(z.literal("")),
});
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;

export const contractTemplateSchema = z.object({
  name: z.string().min(2, "Informe o nome do modelo"),
  bodyJson: z.string().min(1, "Modelo sem conteúdo"),
  isDefault: z.coerce.boolean().optional(),
});
export type ContractTemplateInput = z.infer<typeof contractTemplateSchema>;

export const proposalTemplateSchema = z.object({
  name: z.string().min(2, "Informe o nome do modelo"),
  bodyJson: z.string().min(1, "Modelo sem conteúdo"),
  isDefault: z.coerce.boolean().optional(),
});
export type ProposalTemplateInput = z.infer<typeof proposalTemplateSchema>;

export const boardTemplateCardSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Informe o título do card"),
});
export type BoardTemplateCardInput = z.infer<typeof boardTemplateCardSchema>;

export const boardTemplateColumnSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Informe o nome da coluna"),
  color: z.string().optional().or(z.literal("")),
  cards: z.array(boardTemplateCardSchema).optional(),
});
export type BoardTemplateColumnInput = z.infer<typeof boardTemplateColumnSchema>;

export const boardTemplateSchema = z.object({
  name: z.string().min(2, "Informe o nome do modelo"),
  description: z.string().optional().or(z.literal("")),
  isDefault: z.coerce.boolean().optional(),
  columns: z.array(boardTemplateColumnSchema).optional(),
});
export type BoardTemplateInput = z.infer<typeof boardTemplateSchema>;

export const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.coerce.number().positive("Informe um valor maior que zero").max(100_000_000, "Valor acima do limite permitido"),
  description: z.string().min(2, "Informe uma descrição"),
  dueDate: z.string().min(1, "Informe a data"),
  paidDate: z.string().optional().or(z.literal("")),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELED"]),
  clientId: z.string().optional().or(z.literal("")),
  serviceId: z.string().optional().or(z.literal("")),
  teamMemberId: z.string().optional().or(z.literal("")),
  category: z.enum(["MIDIA_PAGA", "FERRAMENTAS", "FOLHA", "IMPOSTOS", "ALUGUEL", "MARKETING", "OUTROS"]).optional().or(z.literal("")),
});
export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionFormValues = z.input<typeof transactionSchema>;

export const kanbanColumnSchema = z.object({
  name: z.string().min(1, "Informe o nome da coluna"),
  color: z.string().optional().or(z.literal("")),
  boardId: z.string().optional().or(z.literal("")),
});
export type KanbanColumnInput = z.infer<typeof kanbanColumnSchema>;

export const kanbanColumnReorderSchema = z.object({
  columnIds: z.array(z.string()).min(1),
});
export type KanbanColumnReorderInput = z.infer<typeof kanbanColumnReorderSchema>;

export const kanbanBoardSchema = z.object({
  name: z.string().min(1, "Informe o nome do quadro"),
  clientId: z.string().optional().or(z.literal("")),
  templateId: z.string().optional().or(z.literal("")),
});
export type KanbanBoardInput = z.infer<typeof kanbanBoardSchema>;

export const columnAutomationSchema = z.object({
  trigger: z.enum(["ENTER_COLUMN", "TYPE_CHANGED_TO", "CARD_IDLE", "DUE_DATE_APPROACHING"]),
  action: z.enum([
    "ASSIGN_MEMBER",
    "MARK_DUE_DATE_DONE",
    "ADD_COMMENT",
    "ADD_CHECKLIST",
    "SET_DEMAND_TYPE",
    "MOVE_TO_COLUMN",
    "SET_URGENT",
    "CLEAR_URGENT",
    "SORT_BY_DUE_DATE",
    "PROMPT_SCHEDULE",
    "AI_DRAFT_CAPTION",
  ]),
  triggerDemandTypeId: z.string().optional().or(z.literal("")),
  triggerThresholdDays: z.coerce.number().int().min(1).max(365).optional(),
  assigneeId: z.string().optional().or(z.literal("")),
  commentText: z.string().optional().or(z.literal("")),
  mentionUserId: z.string().optional().or(z.literal("")),
  checklistTitle: z.string().optional().or(z.literal("")),
  checklistItems: z.string().optional().or(z.literal("")),
  setDemandTypeId: z.string().optional().or(z.literal("")),
  moveToColumnId: z.string().optional().or(z.literal("")),
  active: z.coerce.boolean().optional(),
});
export type ColumnAutomationInput = z.infer<typeof columnAutomationSchema>;

export const demandTypeSchema = z.object({
  name: z.string().min(1, "Informe o nome do tipo"),
  color: z.string().min(1, "Escolha uma cor"),
});
export type DemandTypeInput = z.infer<typeof demandTypeSchema>;

export const attachmentInputSchema = z.object({
  url: z.string().min(1),
  type: z.enum(["IMAGE", "VIDEO", "FILE"]),
  name: z.string().optional().or(z.literal("")),
});
export type AttachmentInput = z.infer<typeof attachmentInputSchema>;

// Usado nos fluxos que publicam direto em rede social (post de aprovação,
// agendamento rápido) - lá um anexo FILE (pdf/doc/xlsx) nunca é válido.
export const mediaAttachmentInputSchema = z.object({
  url: z.string().min(1),
  type: z.enum(["IMAGE", "VIDEO"]),
  name: z.string().optional().or(z.literal("")),
});

export const kanbanCardSchema = z.object({
  title: z.string().min(2, "Informe o título"),
  description: z.string().optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  columnId: z.string().min(1),
  clientId: z.string().optional().or(z.literal("")),
  projectId: z.string().optional().or(z.literal("")),
  assigneeId: z.string().optional().or(z.literal("")),
  postId: z.string().optional().or(z.literal("")),
  demandTypeId: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  estimatedHours: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  attachments: z.array(attachmentInputSchema).optional(),
});
export type KanbanCardInput = z.infer<typeof kanbanCardSchema>;
export type KanbanCardFormValues = z.input<typeof kanbanCardSchema>;

export const quickScheduleSchema = z.object({
  title: z.string().min(2, "Informe o título"),
  description: z.string().optional().or(z.literal("")),
  clientId: z.string().min(1, "Selecione um cliente"),
  network: z.enum(["INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "LINKEDIN", "THREADS"]),
  scheduledAt: z.string().min(1, "Escolha data e horário"),
  attachments: z.array(mediaAttachmentInputSchema).optional(),
});
export type QuickScheduleInput = z.infer<typeof quickScheduleSchema>;

export const folderSchema = z.object({
  name: z.string().min(1, "Informe o nome da pasta"),
  kind: z.enum(["NOTE", "CHECKLIST"]),
});
export type FolderInput = z.infer<typeof folderSchema>;

export const noteSchema = z.object({
  title: z.string().min(1, "Informe o título"),
  content: z.string().optional().or(z.literal("")),
  folderId: z.string().optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  projectId: z.string().optional().or(z.literal("")),
});
export type NoteInput = z.infer<typeof noteSchema>;

export const checklistSchema = z.object({
  title: z.string().min(1, "Informe o título"),
  folderId: z.string().optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  projectId: z.string().optional().or(z.literal("")),
  cardId: z.string().optional().or(z.literal("")),
});
export type ChecklistInput = z.infer<typeof checklistSchema>;

export const checklistItemSchema = z.object({
  text: z.string().min(1, "Informe o texto do item"),
});
export type ChecklistItemInput = z.infer<typeof checklistItemSchema>;

export const commentSchema = z.object({
  text: z.string().min(1, "Escreva um comentário"),
  imageUrl: z.string().optional().or(z.literal("")),
  mentionedUserId: z.string().optional().or(z.literal("")),
});
export type CommentInput = z.infer<typeof commentSchema>;

export const postSchema = z.object({
  title: z.string().min(1, "Informe o título"),
  caption: z.string().optional().or(z.literal("")),
  clientId: z.string().min(1, "Selecione um cliente"),
  projectId: z.string().optional().or(z.literal("")),
  demandTypeId: z.string().optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  scheduledDate: z.string().optional().or(z.literal("")),
  attachments: z.array(mediaAttachmentInputSchema).min(1, "Envie ao menos uma imagem ou vídeo"),
});
export type PostInput = z.infer<typeof postSchema>;

export const contractedServiceSchema = z.object({
  name: z.string().min(1, "Informe o nome do serviço"),
  scope: z.string().optional().or(z.literal("")),
  value: z.coerce.number().min(0),
  period: z.enum(["MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL", "ONE_TIME"]),
  startDate: z.string().min(1, "Informe a data de início"),
  renewalDate: z.string().optional().or(z.literal("")),
});
export type ContractedServiceInput = z.infer<typeof contractedServiceSchema>;

export const postReviewSchema = z.object({
  action: z.enum(["approve", "request_changes", "reject"]),
  feedback: z.string().optional().or(z.literal("")),
  reviewerName: z.string().optional().or(z.literal("")),
});
export type PostReviewInput = z.infer<typeof postReviewSchema>;

export const importBoardsRequestSchema = z.object({
  token: z.string().min(1, "Informe o token"),
});
export type ImportBoardsRequest = z.infer<typeof importBoardsRequestSchema>;

export const importStartSchema = z.object({
  token: z.string().min(1, "Informe o token"),
  sourceBoardId: z.string().min(1),
  sourceBoardName: z.string().min(1),
  targetBoardName: z.string().min(1, "Informe o nome do quadro"),
  clientId: z.string().optional().or(z.literal("")),
});
export type ImportStartInput = z.infer<typeof importStartSchema>;

export const chatChannelSchema = z.object({
  name: z.string().min(1, "Informe o nome do canal"),
  kind: z.enum(["SECTOR", "GROUP"]),
  sector: z.string().optional().or(z.literal("")),
  memberIds: z.array(z.string()).optional(),
  avatarUrl: z.string().optional().or(z.literal("")),
  color: z.string().optional().or(z.literal("")),
});
export type ChatChannelInput = z.infer<typeof chatChannelSchema>;

export const chatChannelUpdateSchema = z.object({
  name: z.string().min(1, "Informe o nome do grupo").optional(),
  avatarUrl: z.string().optional().or(z.literal("")),
  color: z.string().optional().or(z.literal("")),
});
export type ChatChannelUpdateInput = z.infer<typeof chatChannelUpdateSchema>;

export const chatDmSchema = z.object({
  userId: z.string().min(1, "Selecione uma pessoa"),
});
export type ChatDmInput = z.infer<typeof chatDmSchema>;

export const chatMessageSchema = z.object({
  text: z.string().min(1, "Escreva uma mensagem"),
  mentionedUserId: z.string().optional().or(z.literal("")),
  replyToId: z.string().optional().or(z.literal("")),
});
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

export const personaSchema = z.object({
  photoUrl: z.string().optional().or(z.literal("")),
  name: z.string().optional().or(z.literal("")),
  age: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  occupation: z.string().optional().or(z.literal("")),
  incomeLevel: z.string().optional().or(z.literal("")),
  painPoints: z.array(z.string()).optional(),
  desires: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
  objections: z.array(z.string()).optional(),
  buyingTriggers: z.array(z.string()).optional(),
  notes: z.string().optional().or(z.literal("")),
});
export type PersonaInput = z.infer<typeof personaSchema>;

export const profileDiagnosisSchema = z.object({
  instagramHandle: z.string().optional().or(z.literal("")),
  audience: z.string().optional().or(z.literal("")),
  positioning: z.string().optional().or(z.literal("")),
  contentPillars: z.array(z.string()).optional(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  avgLikes: z.coerce.number().int().min(0).optional().or(z.literal("").transform(() => undefined)),
  avgComments: z.coerce.number().int().min(0).optional().or(z.literal("").transform(() => undefined)),
  avgShares: z.coerce.number().int().min(0).optional().or(z.literal("").transform(() => undefined)),
  storyInteraction: z.string().optional().or(z.literal("")),
  rating: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().or(z.literal("")),
  recommendations: z.string().optional().or(z.literal("")),
});
export type ProfileDiagnosisInput = z.infer<typeof profileDiagnosisSchema>;

export const competitorSchema = z.object({
  name: z.string().min(1, "Informe o nome do concorrente"),
  handle: z.string().optional().or(z.literal("")),
  avatarUrl: z.string().optional().or(z.literal("")),
  followers: z.string().optional().or(z.literal("")),
  frequency: z.string().optional().or(z.literal("")),
  type: z.string().optional().or(z.literal("")),
  sells: z.string().optional().or(z.literal("")),
  differential: z.string().optional().or(z.literal("")),
  niche: z.string().optional().or(z.literal("")),
  strengths: z.string().optional().or(z.literal("")),
  weaknesses: z.string().optional().or(z.literal("")),
  opportunities: z.string().optional().or(z.literal("")),
});
export type CompetitorInput = z.infer<typeof competitorSchema>;

export const positioningSchema = z.object({
  photoUrl: z.string().optional().or(z.literal("")),
  niche: z.string().optional().or(z.literal("")),
  archetypePrimary: z.string().optional().or(z.literal("")),
  archetypeSecondary: z.string().optional().or(z.literal("")),
  essence: z.string().optional().or(z.literal("")),
  personalityTraits: z.array(z.string()).optional(),
  communicationStyle: z.array(z.string()).optional(),
  toneOfVoice: z.array(z.string()).optional(),
  toneExample: z.string().optional().or(z.literal("")),
  colorPalette: z.string().optional().or(z.literal("")),
  typography: z.string().optional().or(z.literal("")),
  visualStyle: z.string().optional().or(z.literal("")),
});
export type PositioningInput = z.infer<typeof positioningSchema>;

export const keyVisualSchema = z.object({
  logoUrl: z.string().optional().or(z.literal("")),
  colors: z.array(z.string()).optional(),
  primaryFont: z.string().optional().or(z.literal("")),
  secondaryFont: z.string().optional().or(z.literal("")),
  layoutNotes: z.string().optional().or(z.literal("")),
  guidelines: z.string().optional().or(z.literal("")),
  doNotes: z.string().optional().or(z.literal("")),
  dontNotes: z.string().optional().or(z.literal("")),
});
export type KeyVisualInput = z.infer<typeof keyVisualSchema>;

export const moodboardSchema = z.object({
  description: z.string().optional().or(z.literal("")),
});
export type MoodboardInput = z.infer<typeof moodboardSchema>;

export const salesOpportunitySchema = z.object({
  name: z.string().min(1, "Informe o nome do lead ou empresa"),
  contactName: z.string().optional().or(z.literal("")),
  email: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  document: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  monthlyValue: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  setupValue: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  source: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  expectedCloseDate: z.string().optional().or(z.literal("")),
  lostReason: z.string().optional().or(z.literal("")),
  stageId: z.string().min(1, "Selecione uma etapa"),
  responsibleId: z.string().optional().or(z.literal("")),
});
export type SalesOpportunityFormValues = z.input<typeof salesOpportunitySchema>;
export type SalesOpportunityInput = z.infer<typeof salesOpportunitySchema>;

export const salesStageSchema = z.object({
  name: z.string().min(1, "Informe o nome da etapa"),
  color: z.string().optional().or(z.literal("")),
  isWon: z.boolean().optional(),
  isLost: z.boolean().optional(),
});
export type SalesStageInput = z.infer<typeof salesStageSchema>;

export const salesGoalSchema = z.object({
  year: z.coerce.number().int().min(2000),
  month: z.coerce.number().int().min(1).max(12),
  target: z.coerce.number().int().min(0),
});
export type SalesGoalInput = z.infer<typeof salesGoalSchema>;

export const proposalItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Informe a descrição do item"),
  scope: z.string().optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1),
  unitValue: z.coerce.number().min(0),
  billingType: z.enum(["MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL", "ONE_TIME"]).optional(),
});
export type ProposalItemInput = z.infer<typeof proposalItemSchema>;

export const proposalInstallmentSchema = z.object({
  id: z.string().optional(),
  dueDate: z.string().min(1, "Informe o vencimento da parcela"),
  value: z.coerce.number().min(0),
});
export type ProposalInstallmentInput = z.infer<typeof proposalInstallmentSchema>;

// Só DRAFT/SENT são aceitos aqui - ACCEPTED/REJECTED/CHANGES_REQUESTED só
// mudam através do pipeline compartilhado (decideProposal), nunca por este
// PATCH direto (ver src/lib/proposals/pipeline.ts).
export const salesProposalSchema = z.object({
  title: z.string().min(1, "Informe o título da proposta"),
  status: z.enum(["DRAFT", "SENT"]).optional(),
  kind: z.enum(["QUICK", "FULL"]).optional(),
  proposalTemplateId: z.string().optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  opportunityId: z.string().optional().or(z.literal("")),
  contactName: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  validUntil: z.string().optional().or(z.literal("")),
  coverImageUrl: z.string().optional().or(z.literal("")),
  items: z.array(proposalItemSchema).min(1, "Adicione ao menos um item"),
  paymentCondition: z.enum(["CASH", "INSTALLMENTS"]).optional(),
  installmentCount: z.coerce.number().int().min(1).optional().or(z.literal("").transform(() => undefined)),
  setupFee: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  paymentMethods: z.array(z.enum(["PIX", "BOLETO", "CARD", "TRANSFER"])).optional(),
  installments: z.array(proposalInstallmentSchema).optional(),
});
export type SalesProposalFormValues = z.input<typeof salesProposalSchema>;
export type SalesProposalInput = z.infer<typeof salesProposalSchema>;

export const proposalDecisionSchema = z.object({
  action: z.enum(["accept", "reject", "request_changes"]),
  signerName: z.string().optional().or(z.literal("")),
  message: z.string().optional().or(z.literal("")),
});
export type ProposalDecisionInput = z.infer<typeof proposalDecisionSchema>;

export const proposalSignSchema = z.object({
  signerName: z.string().min(1, "Informe seu nome"),
  signerDocument: z.string().min(1, "Informe seu CPF/CNPJ"),
  signerFont: z.string().optional().or(z.literal("")),
});
export type ProposalSignInput = z.infer<typeof proposalSignSchema>;

export const proposalViewSchema = z.object({
  durationSeconds: z.coerce.number().int().min(0).max(86400).optional(),
  maxScrollPercent: z.coerce.number().int().min(0).max(100).optional(),
});
export type ProposalViewInput = z.infer<typeof proposalViewSchema>;

export const customFormFieldSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Informe o rótulo do campo"),
  type: z.enum(["TEXT", "TEXTAREA", "SELECT", "RADIO", "CHECKBOX", "DATE", "RATING"]),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
});
export type CustomFormFieldInput = z.infer<typeof customFormFieldSchema>;

export const customFormSchema = z.object({
  title: z.string().min(1, "Informe o título do formulário"),
  description: z.string().optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  active: z.boolean().optional(),
  fields: z.array(customFormFieldSchema).min(1, "Adicione ao menos um campo"),
});
export type CustomFormFormValues = z.input<typeof customFormSchema>;
export type CustomFormInput = z.infer<typeof customFormSchema>;

export const customFormSubmissionSchema = z.object({
  respondentName: z.string().optional().or(z.literal("")),
  respondentEmail: z.string().optional().or(z.literal("")),
  responses: z.array(z.object({ fieldId: z.string(), value: z.string() })),
});
export type CustomFormSubmissionInput = z.infer<typeof customFormSubmissionSchema>;

// Schemas do painel "Serviços" (Configurações → Integrações) - validação do
// lado do cliente só, espelhando o que as rotas já validam no servidor
// (fonte da verdade continua lá); campos de segredo são opcionais porque
// deixar em branco mantém o valor já salvo.
export const aiConfigSchema = z.object({
  provider: z.enum(["anthropic", "openai"]),
  apiKey: z.string().optional().or(z.literal("")),
  model: z.string().optional().or(z.literal("")),
});
export type AiConfigInput = z.infer<typeof aiConfigSchema>;

export const emailConfigSchema = z.object({
  apiKey: z.string().optional().or(z.literal("")),
  fromAddress: z.string().optional().or(z.literal("")),
  fromName: z.string().optional().or(z.literal("")),
});
export type EmailConfigInput = z.infer<typeof emailConfigSchema>;

export const paymentConfigSchema = z.object({
  apiKey: z.string().optional().or(z.literal("")),
  webhookToken: z.string().optional().or(z.literal("")),
  // Checkbox nativo já dá um boolean de verdade via register() - sem coerce
  // (que teria input `unknown`, incompatível com o generic único de useForm).
  sandbox: z.boolean().optional(),
});
export type PaymentConfigInput = z.infer<typeof paymentConfigSchema>;

export const whatsAppConfigSchema = z.object({
  phoneNumberId: z.string().min(1, "Informe o Phone Number ID"),
  accessToken: z.string().optional().or(z.literal("")),
  verifyToken: z.string().optional().or(z.literal("")),
  appSecret: z.string().optional().or(z.literal("")),
  displayName: z.string().optional().or(z.literal("")),
});
export type WhatsAppConfigInput = z.infer<typeof whatsAppConfigSchema>;

export const whatsAppMessageSchema = z.object({
  text: z.string().trim().min(1, "Mensagem vazia"),
});
export type WhatsAppMessageInput = z.infer<typeof whatsAppMessageSchema>;

export const shortLinkSchema = z.object({
  slug: z.string().optional().or(z.literal("")),
  targetUrl: z.string().min(1, "Informe a URL de destino").url("Informe uma URL válida"),
});
export type ShortLinkInput = z.infer<typeof shortLinkSchema>;

export const timeEntrySchema = z.object({
  minutes: z.coerce.number().int().min(1, "Informe uma duração maior que zero"),
  date: z.string().min(1, "Informe a data"),
  note: z.string().optional().or(z.literal("")),
  billable: z.coerce.boolean().optional(),
});
export type TimeEntryInput = z.infer<typeof timeEntrySchema>;

// "secret" é opcional pra permitir editar rótulo/usuário/URL sem reenviar a
// senha - se vier vazio, a rota mantém o valor criptografado já salvo.
export const clientCredentialSchema = z.object({
  label: z.string().min(1, "Informe um rótulo"),
  username: z.string().optional().or(z.literal("")),
  secret: z.string().optional().or(z.literal("")),
  url: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});
export type ClientCredentialInput = z.infer<typeof clientCredentialSchema>;
