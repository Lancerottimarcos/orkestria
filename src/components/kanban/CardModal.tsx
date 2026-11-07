"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Tag,
  Clock,
  Users as UsersIcon,
  Building2,
  Briefcase,
  Send,
  Check,
  X as XIcon,
  Layers,
  Settings2,
  MessageSquare,
  ImagePlus,
  Zap,
  Smile,
  ArrowUpRight,
  CheckCircle2,
  MessageSquareWarning,
  XCircle,
  Hourglass,
  AlignLeft,
  Paperclip,
  ListChecks,
  Wand2,
} from "lucide-react";
import { kanbanCardSchema, type KanbanCardInput, type KanbanCardFormValues } from "@/lib/schemas";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { IconChip } from "@/components/ui/IconChip";
import { Panel } from "@/components/ui/Card";
import { DottedDivider } from "@/components/ui/Dotted";
import { Checkbox } from "@/components/ui/Checkbox";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { POST_STATUS_LABELS, POST_STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/labels";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { AttachmentsField, type AttachmentDraft } from "@/components/attachments/AttachmentsField";
import { DemandTypeManager } from "@/components/demand-types/DemandTypeManager";
import { PowerUpsManager } from "./PowerUpsManager";
import { RichTextEditor } from "./RichTextEditor";
import type { KanbanCardData, KanbanColumnData, Option, ClientOption, UserOption, DemandTypeOption, CommentData } from "./types";

type TimeEntryData = {
  id: string;
  minutes: number;
  date: string;
  note: string | null;
  billable: boolean;
  user: { id: string; name: string; avatarUrl: string | null };
};

type PopoverKey = "column" | "priority" | "dates" | "members" | "client" | "project" | "type" | "hours" | "time" | null;

const PRIORITY_OPTIONS: { value: "LOW" | "MEDIUM" | "HIGH"; label: string }[] = [
  { value: "HIGH", label: PRIORITY_LABELS.HIGH },
  { value: "MEDIUM", label: PRIORITY_LABELS.MEDIUM },
  { value: "LOW", label: PRIORITY_LABELS.LOW },
];

const POST_STATUS_ICON: Record<string, typeof CheckCircle2> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  CHANGES_REQUESTED: MessageSquareWarning,
  REJECTED: XCircle,
};

type SendPayload = {
  attachments: AttachmentDraft[];
  caption: string;
  clientId: string;
  projectId: string;
  demandTypeId: string;
  card: KanbanCardInput;
};

function Popover({
  open,
  onClose,
  width = "w-64",
  align = "left",
  children,
}: {
  open: boolean;
  onClose: () => void;
  width?: string;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={cn(
          "absolute top-full mt-1.5 z-50 bg-surface rounded-2xl shadow-2xl shadow-black/20 p-2 max-h-72 overflow-y-auto",
          align === "right" ? "right-0" : "left-0",
          width,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <IconChip size="sm">{icon}</IconChip>
        <p className="text-base font-semibold text-ink">{title}</p>
      </div>
      {children}
    </div>
  );
}

function SidebarRow({
  icon: Icon,
  label,
  onClick,
  children,
}: {
  icon: typeof Tag;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-full hover:bg-panel-2 transition-colors cursor-pointer text-left group"
    >
      <Icon size={14} className="text-panel-muted flex-shrink-0" strokeWidth={1.8} />
      <span className="text-xs font-medium text-panel-muted w-[74px] flex-shrink-0">{label}</span>
      <span className="flex-1 min-w-0 text-sm font-semibold text-panel-ink truncate">{children}</span>
    </button>
  );
}

function OptionRow({
  label,
  selected,
  onClick,
  icon,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer",
        selected ? "bg-accent/10 text-accent" : "text-ink hover:bg-surface-2",
      )}
    >
      <span className="flex items-center gap-2 min-w-0">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {selected && <Check size={14} className="flex-shrink-0" />}
    </button>
  );
}

export function CardModal({
  open,
  onClose,
  onSubmit,
  onDelete,
  onSendToApproval,
  editing,
  columns,
  defaultColumnId,
  clients,
  projects,
  users,
  demandTypes,
  onDemandTypesChange,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: KanbanCardInput) => void;
  onDelete?: () => void;
  onSendToApproval: (payload: SendPayload) => Promise<void>;
  editing: KanbanCardData | null;
  columns: KanbanColumnData[];
  defaultColumnId: string;
  clients: ClientOption[];
  projects: Option[];
  users: UserOption[];
  demandTypes: DemandTypeOption[];
  onDemandTypesChange: (next: DemandTypeOption[]) => void;
  submitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<KanbanCardFormValues, unknown, KanbanCardInput>({
    resolver: zodResolver(kanbanCardSchema),
    values: editing
      ? {
          title: editing.title,
          description: editing.description ?? "",
          priority: editing.priority,
          columnId: editing.columnId,
          clientId: editing.client?.id ?? "",
          projectId: editing.project?.id ?? "",
          assigneeId: editing.assignee?.id ?? "",
          postId: editing.post?.id ?? "",
          demandTypeId: editing.demandType?.id ?? "",
          dueDate: editing.dueDate ? editing.dueDate.slice(0, 10) : "",
          estimatedHours: editing.estimatedHours ?? undefined,
        }
      : {
          title: "",
          description: "",
          priority: "MEDIUM",
          columnId: defaultColumnId,
          clientId: "",
          projectId: "",
          assigneeId: "",
          postId: "",
          demandTypeId: "",
          dueDate: "",
          estimatedHours: undefined,
        },
  });

  const [popover, setPopover] = useState<PopoverKey>(null);
  const [typeManagerOpen, setTypeManagerOpen] = useState(false);
  const [powerUpsOpen, setPowerUpsOpen] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>(
    () => editing?.attachments.map((a) => ({ id: a.id, url: a.url, type: a.type, name: a.name })) ?? [],
  );
  const [sendOpen, setSendOpen] = useState(false);
  const [sendAttachments, setSendAttachments] = useState<AttachmentDraft[]>([]);
  const [sendCaption, setSendCaption] = useState("");
  const [sendClientId, setSendClientId] = useState("");
  const [sendProjectId, setSendProjectId] = useState("");
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);

  const { alertDialog } = useConfirmDialog();
  const [comments, setComments] = useState<CommentData[]>(() => editing?.comments ?? []);
  const [commentText, setCommentText] = useState("");
  const [commentImage, setCommentImage] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const [checklists, setChecklists] = useState<KanbanCardData["checklists"]>(() => editing?.checklists ?? []);
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [creatingChecklist, setCreatingChecklist] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [generatingCaption, setGeneratingCaption] = useState(false);

  const [timeEntries, setTimeEntries] = useState<TimeEntryData[]>([]);
  const [timeEntriesLoaded, setTimeEntriesLoaded] = useState(false);
  const [newTimeMinutes, setNewTimeMinutes] = useState("");
  const [newTimeDate, setNewTimeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newTimeNote, setNewTimeNote] = useState("");
  const [newTimeBillable, setNewTimeBillable] = useState(true);
  const [savingTimeEntry, setSavingTimeEntry] = useState(false);

  const priority = watch("priority");
  const dueDate = watch("dueDate");
  const estimatedHours = watch("estimatedHours");
  const clientId = watch("clientId");
  const projectId = watch("projectId");
  const assigneeId = watch("assigneeId");
  const demandTypeId = watch("demandTypeId");
  const columnId = watch("columnId");

  const priorityMeta = PRIORITY_OPTIONS.find((p) => p.value === priority)!;
  const clientName = clients.find((c) => c.id === clientId)?.name;
  const projectName = projects.find((p) => p.id === projectId)?.name;
  const assigneeName = users.find((u) => u.id === assigneeId)?.name;
  const assigneeAvatarUrl = users.find((u) => u.id === assigneeId)?.avatarUrl;
  const demandType = demandTypes.find((t) => t.id === demandTypeId);
  const columnName = columns.find((c) => c.id === columnId)?.name;

  function togglePopover(key: PopoverKey) {
    setPopover((p) => (p === key ? null : key));
  }

  function toggleTimePopover() {
    togglePopover("time");
    if (!timeEntriesLoaded && editing) {
      fetch(`/api/kanban/cards/${editing.id}/tempo`)
        .then((r) => r.json())
        .then((data) => {
          setTimeEntries(data);
          setTimeEntriesLoaded(true);
        });
    }
  }

  async function handleAddTimeEntry() {
    if (!editing || !newTimeMinutes || Number(newTimeMinutes) <= 0) return;
    setSavingTimeEntry(true);
    try {
      const res = await fetch(`/api/kanban/cards/${editing.id}/tempo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: Number(newTimeMinutes), date: newTimeDate, note: newTimeNote, billable: newTimeBillable }),
      });
      if (res.ok) {
        const entry = await res.json();
        setTimeEntries((prev) => [entry, ...prev]);
        setNewTimeMinutes("");
        setNewTimeNote("");
        setNewTimeBillable(true);
      }
    } finally {
      setSavingTimeEntry(false);
    }
  }

  async function handleRemoveTimeEntry(id: string) {
    setTimeEntries((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/tempo/${id}`, { method: "DELETE" });
  }

  function handleSubmitWithAttachments(data: KanbanCardInput) {
    onSubmit({ ...data, attachments: attachments.map(({ url, type, name }) => ({ url, type, name: name ?? undefined })) });
  }

  function openSendPanel() {
    setSendAttachments(editing?.attachments.map((a) => ({ id: a.id, url: a.url, type: a.type, name: a.name })) ?? attachments);
    setSendCaption(editing?.description ?? "");
    setSendClientId(clientId ?? "");
    setSendProjectId(projectId ?? "");
    setSendError("");
    setSendOpen(true);
  }

  async function handleConfirmSend() {
    if (sendAttachments.length === 0) {
      setSendError("Envie ao menos uma imagem ou vídeo");
      return;
    }
    if (!sendClientId) {
      setSendError("Selecione um cliente");
      return;
    }
    setSending(true);
    try {
      await onSendToApproval({
        attachments: sendAttachments,
        caption: sendCaption.trim(),
        clientId: sendClientId,
        projectId: sendProjectId,
        demandTypeId: demandTypeId ?? "",
        card: {
          ...getValues(),
          estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
          attachments: attachments.map(({ url, type, name }) => ({ url, type, name: name ?? undefined })),
        },
      });
      setSendOpen(false);
    } finally {
      setSending(false);
    }
  }

  function handleCommentImageFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCommentImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handlePostComment() {
    if (!editing || (!commentText.trim() && !commentImage)) return;
    setPostingComment(true);
    try {
      const res = await fetch(`/api/kanban/cards/${editing.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText.trim() || "📎 anexo", imageUrl: commentImage }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [...prev, comment]);
        setCommentText("");
        setCommentImage("");
      }
    } finally {
      setPostingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!editing) return;
    const snapshot = comments;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    const res = await fetch(`/api/kanban/cards/${editing.id}/comments/${commentId}`, { method: "DELETE" });
    if (!res.ok) {
      setComments(snapshot);
      const data = await res.json().catch(() => null);
      await alertDialog(data?.error || "Não foi possível remover o comentário.");
    }
  }

  async function handleGenerateCaption() {
    if (!editing) return;
    setGeneratingCaption(true);
    try {
      const res = await fetch(`/api/kanban/cards/${editing.id}/ai-draft-caption`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setComments((prev) => [...prev, data]);
      } else {
        await alertDialog(data?.error || "Não foi possível gerar o rascunho com IA.");
      }
    } finally {
      setGeneratingCaption(false);
    }
  }

  async function handleCreateChecklist() {
    if (!editing || !newChecklistTitle.trim()) return;
    setCreatingChecklist(true);
    setChecklistError(null);
    try {
      const res = await fetch("/api/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newChecklistTitle.trim(), cardId: editing.id }),
      });
      if (res.ok) {
        const checklist = await res.json();
        setChecklists((prev) => [...prev, { id: checklist.id, title: checklist.title, total: 0, done: 0 }]);
        setNewChecklistTitle("");
        setAddingChecklist(false);
      } else if (res.status === 403) {
        // Checklist é um módulo separado do Kanban - sem isso a pessoa via o
        // campo simplesmente "não reagir", sem entender que faltava permissão.
        setChecklistError("Você não tem acesso ao módulo Checklist - peça pra um admin liberar.");
      } else {
        setChecklistError("Não foi possível criar a checklist.");
      }
    } finally {
      setCreatingChecklist(false);
    }
  }

  const postStatusColor = editing?.post ? POST_STATUS_COLORS[editing.post.status] : null;
  const PostStatusIcon = editing?.post ? POST_STATUS_ICON[editing.post.status] : null;

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar" : "Nova"} titleAccent="demanda" width="xl">
      <form onSubmit={handleSubmit(handleSubmitWithAttachments)} className="flex flex-col gap-6">
        <div>
          <input
            {...register("title")}
            placeholder="Título da demanda"
            className="w-full bg-transparent border-none outline-none text-[26px] font-light tracking-tight text-ink placeholder:text-muted-2"
          />
          {errors.title && <span className="text-xs text-danger">{errors.title.message}</span>}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: content */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            <Section
              icon={<AlignLeft size={15} strokeWidth={1.8} />}
              title={
                <span className="flex items-center gap-2 flex-wrap">
                  Descrição
                  {editing && (
                    <button
                      type="button"
                      onClick={handleGenerateCaption}
                      disabled={generatingCaption}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent bg-accent/10 hover:bg-accent/15 rounded-full px-2.5 py-1 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Wand2 size={11} /> {generatingCaption ? "Gerando..." : "Rascunho com IA"}
                    </button>
                  )}
                </span>
              }
            >
              <RichTextEditor
                defaultValue={editing?.description ?? ""}
                onChange={(html) => setValue("description", html)}
                placeholder="Clique para adicionar uma descrição..."
              />
            </Section>

            <DottedDivider />

            <Section icon={<Paperclip size={15} strokeWidth={1.8} />} title="Anexos">
              <AttachmentsField attachments={attachments} onChange={setAttachments} />
              <p className="text-xs text-muted-2">
                Fotos ou vídeos ficam salvos na demanda e são enviados junto na aprovação
              </p>
            </Section>

            {editing && (
              <>
                <DottedDivider />

                <Section icon={<ListChecks size={15} strokeWidth={1.8} />} title="Checklists">
                  <div className="flex flex-col gap-2">
                    {checklists.map((cl) => {
                      const pct = cl.total > 0 ? (cl.done / cl.total) * 100 : 0;
                      return (
                        <a
                          key={cl.id}
                          href={`/checklist/${cl.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 bg-surface-2 rounded-full pl-4 pr-3 py-2.5 hover:bg-surface-3 transition-colors"
                        >
                          <span className="text-xs font-semibold text-ink flex-1 truncate">{cl.title}</span>
                          <div className="w-20 h-1.5 bg-surface-3 rounded-full overflow-hidden flex-shrink-0">
                            <div
                              className={cn("h-full rounded-full", pct === 100 ? "bg-success" : "bg-accent")}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-muted-2 flex-shrink-0">
                            {cl.done}/{cl.total}
                          </span>
                        </a>
                      );
                    })}
                    {addingChecklist ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={newChecklistTitle}
                            onChange={(e) => setNewChecklistTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleCreateChecklist();
                              }
                              if (e.key === "Escape") setAddingChecklist(false);
                            }}
                            placeholder="Nome da checklist"
                            className="flex-1 bg-surface-2 rounded-full px-4 py-2 text-sm text-ink outline-none border border-transparent focus:border-accent transition-colors placeholder:text-muted-2"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleCreateChecklist}
                            disabled={creatingChecklist || !newChecklistTitle.trim()}
                          >
                            Criar
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setAddingChecklist(false)}>
                            Cancelar
                          </Button>
                        </div>
                        {checklistError && <p className="text-xs text-danger pl-1">{checklistError}</p>}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingChecklist(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-light transition-colors cursor-pointer self-start"
                      >
                        <Plus size={13} /> Adicionar checklist
                      </button>
                    )}
                  </div>
                </Section>
              </>
            )}

            {editing && (
              <>
                <DottedDivider />

                <Section
                  icon={<MessageSquare size={15} strokeWidth={1.8} />}
                  title={
                    <>
                      Comentários{" "}
                      {comments.length > 0 && <span className="text-muted font-medium">({comments.length})</span>}
                    </>
                  }
                >
                  {comments.length > 0 && (
                    <div className="flex flex-col gap-3 max-h-56 overflow-y-auto pr-1">
                      {comments.map((c) => (
                        <div key={c.id} className="group flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-[11px] font-bold text-ink flex-shrink-0">
                            {(c.author?.name ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-ink">{c.author?.name ?? "Automação"}</span>
                              <span className="text-[10px] text-muted-2">{formatDate(c.createdAt)}</span>
                              {c.isAutomated && (
                                <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                                  automático
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-ink whitespace-pre-wrap mt-0.5">{c.text}</p>
                            {c.mentionedUser && (
                              <span className="text-[10px] text-accent block mt-0.5">@{c.mentionedUser.name} foi marcado</span>
                            )}
                            {c.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.imageUrl} alt="Anexo do comentário" className="mt-1.5 max-w-[160px] rounded-2xl" />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(c.id)}
                            title="Remover comentário"
                            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-2 hover:text-danger transition-opacity flex-shrink-0"
                          >
                            <XIcon size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-xl bg-surface-2 border border-transparent focus-within:border-accent transition-colors overflow-hidden">
                    {commentImage && (
                      <div className="relative w-16 h-16 m-3 mb-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={commentImage} alt="Prévia" className="w-16 h-16 rounded-2xl object-cover" />
                        <button
                          type="button"
                          onClick={() => setCommentImage("")}
                          className="absolute -top-1.5 -right-1.5 bg-black/70 text-white rounded-full p-0.5 cursor-pointer"
                        >
                          <XIcon size={10} />
                        </button>
                      </div>
                    )}
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handlePostComment();
                        }
                      }}
                      placeholder="Clique para adicionar um comentário"
                      rows={2}
                      className="w-full bg-transparent px-5 pt-3.5 pb-1 text-sm text-ink outline-none placeholder:text-muted-2 resize-none"
                    />
                    <div className="flex items-center justify-between px-3 pb-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setCommentText((t) => `${t}🙂`)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-2 hover:text-accent hover:bg-surface-3 transition-colors cursor-pointer"
                        >
                          <Smile size={16} />
                        </button>
                        <label className="w-8 h-8 rounded-full flex items-center justify-center text-muted-2 hover:text-accent hover:bg-surface-3 transition-colors cursor-pointer">
                          <ImagePlus size={16} />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleCommentImageFile(e.target.files?.[0] ?? null)}
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={handlePostComment}
                        disabled={postingComment || (!commentText.trim() && !commentImage)}
                        className="w-9 h-9 rounded-full bg-accent text-black flex items-center justify-center hover:bg-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>

                  {comments.length === 0 && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-2">
                      <MessageSquare size={12} /> Nenhum comentário
                    </p>
                  )}
                </Section>
              </>
            )}
          </div>

          {/* Right: sidebar */}
          <div className="lg:w-72 flex-shrink-0">
            <Panel padding="sm" className="flex flex-col gap-1">
              {editing && (
                <div className="mb-2">
                  {editing.post ? (
                    <a
                      href={`/aprovacao/${editing.post.token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-full px-3 py-2.5 transition-opacity hover:opacity-90 group"
                      style={{
                        background: `color-mix(in srgb, ${postStatusColor} 18%, transparent)`,
                      }}
                    >
                      <span
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: `color-mix(in srgb, ${postStatusColor} 25%, transparent)` }}
                      >
                        {PostStatusIcon && <PostStatusIcon size={16} style={{ color: postStatusColor! }} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-bold" style={{ color: postStatusColor! }}>
                          {POST_STATUS_LABELS[editing.post.status]}
                        </span>
                        <span className="block text-[11px] text-panel-muted truncate">Ver aprovação do cliente</span>
                      </span>
                      <ArrowUpRight
                        size={15}
                        className="flex-shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                        style={{ color: postStatusColor! }}
                      />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={openSendPanel}
                      className="w-full flex items-center justify-center gap-2 rounded-full bg-accent text-black font-semibold text-sm px-4 py-3 hover:bg-accent-light transition-colors cursor-pointer"
                    >
                      <Send size={15} /> Enviar para aprovação
                    </button>
                  )}
                  {editing.post?.feedback && (
                    <p className="text-xs text-panel-ink whitespace-pre-wrap mt-2 bg-panel-2 rounded-2xl px-4 py-3">
                      <span className="font-semibold">Alterações solicitadas:</span> {editing.post.feedback}
                    </p>
                  )}
                  <div className="border-t border-dotted border-panel-2 mt-3" />
                </div>
              )}

              <div className="relative">
                <SidebarRow icon={Layers} label="Coluna" onClick={() => togglePopover("column")}>
                  {columnName}
                </SidebarRow>
                <Popover open={popover === "column"} onClose={() => setPopover(null)} align="right">
                  {columns.map((c) => (
                    <OptionRow
                      key={c.id}
                      label={c.name}
                      selected={columnId === c.id}
                      onClick={() => {
                        setValue("columnId", c.id);
                        setPopover(null);
                      }}
                    />
                  ))}
                </Popover>
              </div>

              <div className="relative">
                <SidebarRow icon={Tag} label="Prioridade" onClick={() => togglePopover("priority")}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLORS[priority] }} />
                    {priorityMeta.label}
                  </span>
                </SidebarRow>
                <Popover open={popover === "priority"} onClose={() => setPopover(null)} align="right">
                  <p className="px-3 py-1.5 text-xs font-medium text-muted">Prioridade</p>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setValue("priority", opt.value);
                        setPopover(null);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-full text-sm font-semibold text-ink transition-colors cursor-pointer",
                        priority === opt.value ? "bg-surface-2" : "hover:bg-surface-2",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ background: PRIORITY_COLORS[opt.value] }} />
                        {opt.label}
                      </span>
                      {priority === opt.value && <Check size={14} style={{ color: PRIORITY_COLORS[opt.value] }} />}
                    </button>
                  ))}
                </Popover>
              </div>

              <div className="relative">
                <SidebarRow icon={Layers} label="Tipo" onClick={() => togglePopover("type")}>
                  {demandType ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: demandType.color }} />
                      {demandType.name}
                    </span>
                  ) : (
                    <span className="text-panel-muted font-medium">Nenhum</span>
                  )}
                </SidebarRow>
                <Popover open={popover === "type"} onClose={() => setPopover(null)} align="right">
                  <button
                    type="button"
                    onClick={() => {
                      setValue("demandTypeId", "");
                      setPopover(null);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer",
                      !demandTypeId ? "bg-accent/10 text-accent" : "text-ink hover:bg-surface-2",
                    )}
                  >
                    Nenhum
                    {!demandTypeId && <Check size={14} />}
                  </button>
                  {demandTypes.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setValue("demandTypeId", t.id);
                        setPopover(null);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-full text-sm font-semibold text-ink transition-colors cursor-pointer",
                        demandTypeId === t.id ? "bg-surface-2" : "hover:bg-surface-2",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
                        {t.name}
                      </span>
                      {demandTypeId === t.id && <Check size={14} style={{ color: t.color }} />}
                    </button>
                  ))}
                  <DottedDivider className="my-1.5" />
                  <button
                    type="button"
                    onClick={() => {
                      setPopover(null);
                      setTypeManagerOpen(true);
                    }}
                    className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-full text-xs font-semibold text-muted hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer"
                  >
                    <Settings2 size={13} /> Gerenciar tipos
                  </button>
                </Popover>
              </div>

              <div className="relative">
                <SidebarRow icon={Clock} label="Prazo" onClick={() => togglePopover("dates")}>
                  {dueDate ? formatDate(dueDate) : <span className="text-panel-muted font-medium">Sem prazo</span>}
                </SidebarRow>
                <Popover open={popover === "dates"} onClose={() => setPopover(null)} align="right" width="w-60">
                  <div className="p-1.5 flex flex-col gap-2.5">
                    <p className="text-xs font-medium text-muted">Prazo de entrega</p>
                    <Input type="date" {...register("dueDate")} className="text-sm" />
                    <div className="flex gap-2 pt-1">
                      <Button type="button" size="sm" onClick={() => setPopover(null)} className="flex-1">
                        Salvar
                      </Button>
                      {dueDate && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setValue("dueDate", "");
                            setPopover(null);
                          }}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                  </div>
                </Popover>
              </div>

              <div className="relative">
                <SidebarRow icon={Hourglass} label="Horas estimadas" onClick={() => togglePopover("hours")}>
                  {estimatedHours ? `${estimatedHours}h` : <span className="text-panel-muted font-medium">Sem estimativa</span>}
                </SidebarRow>
                <Popover open={popover === "hours"} onClose={() => setPopover(null)} align="right" width="w-60">
                  <div className="p-1.5 flex flex-col gap-2.5">
                    <p className="text-xs font-medium text-muted">Horas estimadas</p>
                    <Input type="number" min="0" step="0.5" {...register("estimatedHours")} className="text-sm" placeholder="Ex: 4" />
                    <div className="flex gap-2 pt-1">
                      <Button type="button" size="sm" onClick={() => setPopover(null)} className="flex-1">
                        Salvar
                      </Button>
                      {estimatedHours != null && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setValue("estimatedHours", undefined);
                            setPopover(null);
                          }}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                  </div>
                </Popover>
              </div>

              {editing && (
                <div className="relative">
                  <SidebarRow icon={Clock} label="Apontamentos" onClick={toggleTimePopover}>
                    {timeEntriesLoaded && timeEntries.length > 0 ? (
                      `${(timeEntries.reduce((sum, e) => sum + e.minutes, 0) / 60).toFixed(1).replace(/\.0$/, "")}h`
                    ) : (
                      <span className="text-panel-muted font-medium">Nenhum</span>
                    )}
                  </SidebarRow>
                  <Popover open={popover === "time"} onClose={() => setPopover(null)} align="right" width="w-72">
                    <div className="p-1.5 flex flex-col gap-3">
                      <p className="text-xs font-medium text-muted">Apontar horas</p>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={newTimeMinutes}
                          onChange={(e) => setNewTimeMinutes(e.target.value)}
                          placeholder="Minutos"
                          className="text-sm flex-1"
                        />
                        <Input
                          type="date"
                          value={newTimeDate}
                          onChange={(e) => setNewTimeDate(e.target.value)}
                          className="text-sm flex-1"
                        />
                      </div>
                      <Input
                        value={newTimeNote}
                        onChange={(e) => setNewTimeNote(e.target.value)}
                        placeholder="Nota (opcional)"
                        className="text-sm"
                      />
                      <label className="flex items-center gap-2 text-xs text-panel-ink cursor-pointer">
                        <Checkbox checked={newTimeBillable} onChange={(e) => setNewTimeBillable(e.target.checked)} />
                        Faturável ao cliente
                      </label>
                      <Button type="button" size="sm" onClick={handleAddTimeEntry} disabled={savingTimeEntry || !newTimeMinutes}>
                        Adicionar
                      </Button>

                      {timeEntriesLoaded && timeEntries.length > 0 && (
                        <>
                          <DottedDivider />
                          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                            {timeEntries.map((entry) => (
                              <div key={entry.id} className="flex items-center justify-between gap-2 text-xs">
                                <div className="min-w-0">
                                  <span className="text-panel-ink font-medium">{(entry.minutes / 60).toFixed(1).replace(/\.0$/, "")}h</span>
                                  <span className="text-panel-muted"> · {formatDate(entry.date)} · {entry.user.name}</span>
                                  {!entry.billable && (
                                    <span className="text-panel-muted"> · não faturável</span>
                                  )}
                                  {entry.note && <p className="text-panel-muted truncate">{entry.note}</p>}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTimeEntry(entry.id)}
                                  className="text-panel-muted hover:text-danger flex-shrink-0 cursor-pointer"
                                >
                                  <XIcon size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </Popover>
                </div>
              )}

              <div className="relative">
                <SidebarRow icon={UsersIcon} label="Responsável" onClick={() => togglePopover("members")}>
                  {assigneeName ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Avatar name={assigneeName} url={assigneeAvatarUrl} size={18} />
                      {assigneeName}
                    </span>
                  ) : (
                    <span className="text-panel-muted font-medium">Ninguém</span>
                  )}
                </SidebarRow>
                <Popover open={popover === "members"} onClose={() => setPopover(null)} align="right">
                  <OptionRow
                    label="Ninguém"
                    selected={!assigneeId}
                    onClick={() => {
                      setValue("assigneeId", "");
                      setPopover(null);
                    }}
                  />
                  {users.map((u) => (
                    <OptionRow
                      key={u.id}
                      label={u.name}
                      icon={<Avatar name={u.name} url={u.avatarUrl} size={18} />}
                      selected={assigneeId === u.id}
                      onClick={() => {
                        setValue("assigneeId", u.id);
                        setPopover(null);
                      }}
                    />
                  ))}
                </Popover>
              </div>

              <div className="relative">
                <SidebarRow icon={Building2} label="Cliente" onClick={() => togglePopover("client")}>
                  {clientName ?? <span className="text-panel-muted font-medium">Nenhum</span>}
                </SidebarRow>
                <Popover open={popover === "client"} onClose={() => setPopover(null)} align="right">
                  <OptionRow
                    label="Nenhum"
                    selected={!clientId}
                    onClick={() => {
                      setValue("clientId", "");
                      setPopover(null);
                    }}
                  />
                  {clients.map((c) => (
                    <OptionRow
                      key={c.id}
                      label={c.name}
                      selected={clientId === c.id}
                      onClick={() => {
                        setValue("clientId", c.id);
                        setPopover(null);
                      }}
                    />
                  ))}
                </Popover>
              </div>

              <div className="relative">
                <SidebarRow icon={Briefcase} label="Projeto" onClick={() => togglePopover("project")}>
                  {projectName ?? <span className="text-panel-muted font-medium">Nenhum</span>}
                </SidebarRow>
                <Popover open={popover === "project"} onClose={() => setPopover(null)} align="right">
                  <OptionRow
                    label="Nenhum"
                    selected={!projectId}
                    onClick={() => {
                      setValue("projectId", "");
                      setPopover(null);
                    }}
                  />
                  {projects.map((p) => (
                    <OptionRow
                      key={p.id}
                      label={p.name}
                      selected={projectId === p.id}
                      onClick={() => {
                        setValue("projectId", p.id);
                        setPopover(null);
                      }}
                    />
                  ))}
                </Popover>
              </div>

              {editing && (
                <button
                  type="button"
                  onClick={() => setPowerUpsOpen(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-full hover:bg-panel-2 transition-colors cursor-pointer text-left"
                >
                  <Zap size={14} className="text-success flex-shrink-0" strokeWidth={1.8} />
                  <span className="text-xs font-medium text-panel-muted w-[74px] flex-shrink-0">Power-ups</span>
                  <span className="flex-1 min-w-0 text-sm font-semibold text-success truncate">Configurar</span>
                </button>
              )}
            </Panel>
          </div>
        </div>

        <DottedDivider />

        <div className="flex justify-between gap-2">
          {editing && onDelete ? (
            <Button type="button" variant="danger" onClick={onDelete}>
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </form>

      {sendOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4"
          onClick={() => !sending && setSendOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-surface rounded-card p-8 shadow-2xl shadow-black/20 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold tracking-tight text-ink">
                Enviar para <span className="text-accent">aprovação</span>
              </h3>
              <button
                type="button"
                onClick={() => setSendOpen(false)}
                className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:text-accent transition-colors flex-shrink-0 cursor-pointer"
              >
                <XIcon size={16} />
              </button>
            </div>

            <Field
              label="Anexos"
              error={sendAttachments.length === 0 && sendError.startsWith("Envie") ? sendError : undefined}
            >
              <AttachmentsField attachments={sendAttachments} onChange={setSendAttachments} allowFiles={false} />
            </Field>

            <Field label="Cliente" error={!sendClientId && sendError === "Selecione um cliente" ? sendError : undefined}>
              <Select value={sendClientId} onChange={(e) => setSendClientId(e.target.value)}>
                <option value="">Selecione...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id} data-avatar-name={c.name} data-avatar-url={c.avatarUrl}>{c.name}</option>
                ))}
              </Select>
            </Field>

            <Field label="Projeto" hint="Opcional">
              <Select value={sendProjectId} onChange={(e) => setSendProjectId(e.target.value)}>
                <option value="">Nenhum</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </Field>

            <Field label="Legenda / descrição" hint="Opcional, o cliente verá esse texto junto da imagem">
              <Textarea
                value={sendCaption}
                onChange={(e) => setSendCaption(e.target.value)}
                placeholder="Legenda do post..."
              />
            </Field>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setSendOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleConfirmSend} disabled={sending}>
                {sending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <DemandTypeManager
        open={typeManagerOpen}
        onClose={() => setTypeManagerOpen(false)}
        types={demandTypes}
        onTypesChange={onDemandTypesChange}
      />

      {editing && (
        <PowerUpsManager
          open={powerUpsOpen}
          onClose={() => setPowerUpsOpen(false)}
          columnId={editing.columnId}
          cardId={editing.id}
          columns={columns.map((c) => ({ id: c.id, name: c.name }))}
          users={users}
          demandTypes={demandTypes}
        />
      )}
    </Modal>
  );
}
