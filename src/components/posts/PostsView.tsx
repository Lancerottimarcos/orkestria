"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ImagePlus,
  Link2,
  Trash2,
  Clock,
  CheckCircle2,
  MessageSquareWarning,
  XCircle,
  Users,
  FolderKanban,
  Check,
  List,
  CalendarDays,
  GanttChartSquare,
  LayoutGrid,
  Settings2,
  Layers,
  Building2,
  Kanban,
  Grid3x3,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { StatPillRow } from "@/components/ui/StatPills";
import { DottedDivider } from "@/components/ui/Dotted";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { FilterBar, FilterSelect, FilterTabs, FilterClearButton } from "@/components/ui/FilterBar";
import { ViewTabs } from "@/components/views/ViewTabs";
import { MiniCalendar } from "@/components/views/MiniCalendar";
import { GanttChart } from "@/components/views/GanttChart";
import { AttachmentsField, type AttachmentDraft } from "@/components/attachments/AttachmentsField";
import { DemandTypeManager } from "@/components/demand-types/DemandTypeManager";
import { PostsListView } from "./PostsListView";
import { POST_STATUS_COLORS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { copyToClipboard } from "@/lib/clipboard";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type Option = { id: string; name: string };
type ProjectOption = Option & { clientId: string };
type Status = "PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
type PostPriority = "LOW" | "MEDIUM" | "HIGH";
type ViewMode = "grid" | "board" | "feed" | "list" | "calendar" | "gantt";
type DemandTypeOption = { id: string; name: string; color: string };
type AttachmentRow = { id: string; url: string; type: "IMAGE" | "VIDEO"; name: string | null };

export type PostRow = {
  id: string;
  title: string;
  caption: string | null;
  status: Status;
  priority: PostPriority;
  token: string;
  feedback: string | null;
  reviewedAt: string | null;
  scheduledDate: string | null;
  createdAt: string;
  client: Option;
  project: Option | null;
  demandType: DemandTypeOption | null;
  createdBy: { id: string; name: string; avatarUrl: string | null } | null;
  reviewedByName: string | null;
  attachments: AttachmentRow[];
};

const PRIORITY_LABELS: Record<PostPriority, string> = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" };
const PRIORITY_TONE: Record<PostPriority, "muted" | "danger" | "accent"> = {
  LOW: "muted",
  MEDIUM: "accent",
  HIGH: "danger",
};

const STATUS_META: Record<Status, { label: string; tone: "muted" | "success" | "danger"; icon: typeof Clock }> = {
  PENDING: { label: "Pendente", tone: "muted", icon: Clock },
  APPROVED: { label: "Aprovado", tone: "success", icon: CheckCircle2 },
  CHANGES_REQUESTED: { label: "Alterações solicitadas", tone: "danger", icon: MessageSquareWarning },
  REJECTED: { label: "Reprovado", tone: "danger", icon: XCircle },
};

const TABS: { key: "ALL" | Status; label: string }[] = [
  { key: "ALL", label: "Todos" },
  { key: "PENDING", label: "Pendentes" },
  { key: "APPROVED", label: "Aprovados" },
  { key: "CHANGES_REQUESTED", label: "Alterações" },
  { key: "REJECTED", label: "Reprovados" },
];

export function PostsView({
  initialPosts,
  clients,
  projects,
  initialDemandTypes,
}: {
  initialPosts: PostRow[];
  clients: (Option & { avatarUrl: string | null })[];
  projects: ProjectOption[];
  initialDemandTypes: DemandTypeOption[];
}) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const { confirmDialog } = useConfirmDialog();
  const [demandTypes, setDemandTypes] = useState(initialDemandTypes);
  const [typeManagerOpen, setTypeManagerOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const [statusTab, setStatusTab] = useState<"ALL" | Status>("ALL");
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PostRow | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftCaption, setDraftCaption] = useState("");
  const [draftClientId, setDraftClientId] = useState("");
  const [draftProjectId, setDraftProjectId] = useState("");
  const [draftDemandTypeId, setDraftDemandTypeId] = useState("");
  const [draftPriority, setDraftPriority] = useState<PostPriority>("MEDIUM");
  const [draftScheduledDate, setDraftScheduledDate] = useState("");
  const [draftAttachments, setDraftAttachments] = useState<AttachmentDraft[]>([]);
  const [errors, setErrors] = useState<{ title?: string; clientId?: string; attachments?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function refresh() {
    const updated = await fetch("/api/posts").then((r) => r.json());
    setPosts(updated);
    router.refresh();
  }

  function openCreate() {
    setEditing(null);
    setDraftTitle("");
    setDraftCaption("");
    setDraftClientId("");
    setDraftProjectId("");
    setDraftDemandTypeId("");
    setDraftPriority("MEDIUM");
    setDraftScheduledDate("");
    setDraftAttachments([]);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(post: PostRow) {
    setEditing(post);
    setDraftTitle(post.title);
    setDraftCaption(post.caption ?? "");
    setDraftClientId(post.client.id);
    setDraftProjectId(post.project?.id ?? "");
    setDraftDemandTypeId(post.demandType?.id ?? "");
    setDraftPriority(post.priority);
    setDraftScheduledDate(post.scheduledDate ? post.scheduledDate.slice(0, 10) : "");
    setDraftAttachments(post.attachments.map((a) => ({ id: a.id, url: a.url, type: a.type, name: a.name })));
    setErrors({});
    setModalOpen(true);
  }

  async function handleSubmit() {
    const nextErrors: typeof errors = {};
    if (!draftTitle.trim()) nextErrors.title = "Informe o título";
    if (!draftClientId) nextErrors.clientId = "Selecione um cliente";
    if (draftAttachments.length === 0) nextErrors.attachments = "Envie ao menos uma imagem ou vídeo";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const payload = {
        title: draftTitle.trim(),
        caption: draftCaption.trim(),
        clientId: draftClientId,
        projectId: draftProjectId,
        demandTypeId: draftDemandTypeId,
        priority: draftPriority,
        scheduledDate: draftScheduledDate,
        attachments: draftAttachments.map(({ url, type, name }) => ({ url, type, name: name ?? undefined })),
      };
      const url = editing ? `/api/posts/${editing.id}` : "/api/posts";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Falha ao salvar post");
      setModalOpen(false);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(post: PostRow) {
    if (!(await confirmDialog(`Remover o post "${post.title}"?`, { confirmLabel: "Remover" }))) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) {
      setModalOpen(false);
      await refresh();
    }
  }

  function copyLink(post: PostRow) {
    const url = `${window.location.origin}/aprovacao/${post.token}`;
    copyToClipboard(url);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId((id) => (id === post.id ? null : id)), 1800);
  }

  const stats = useMemo(() => {
    return {
      total: posts.length,
      pending: posts.filter((p) => p.status === "PENDING").length,
      approved: posts.filter((p) => p.status === "APPROVED").length,
      changes: posts.filter((p) => p.status === "CHANGES_REQUESTED").length,
    };
  }, [posts]);

  const baseFiltered = useMemo(() => {
    return posts
      .filter((p) => !clientFilter || p.client.id === clientFilter)
      .filter((p) => !typeFilter || p.demandType?.id === typeFilter);
  }, [posts, clientFilter, typeFilter]);

  const filtered = useMemo(() => {
    return baseFiltered.filter((p) => statusTab === "ALL" || p.status === statusTab);
  }, [baseFiltered, statusTab]);

  const boardColumns = useMemo(() => {
    const order: Status[] = ["PENDING", "CHANGES_REQUESTED", "APPROVED", "REJECTED"];
    return order.map((status) => ({
      status,
      meta: STATUS_META[status],
      posts: baseFiltered.filter((p) => p.status === status),
    }));
  }, [baseFiltered]);

  const feedPosts = useMemo(() => {
    return [...baseFiltered].sort((a, b) => {
      const aDate = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Infinity;
      const bDate = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Infinity;
      if (aDate !== bDate) return aDate - bDate;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [baseFiltered]);

  const availableProjects = projects.filter((p) => p.clientId === draftClientId);

  const calendarEvents = useMemo(
    () =>
      filtered
        .filter((p) => p.scheduledDate)
        .map((p) => ({
          id: p.id,
          date: new Date(p.scheduledDate!),
          label: p.title,
          color: POST_STATUS_COLORS[p.status],
          onClick: () => openEdit(p),
        })),
    [filtered],
  );

  const ganttRows = useMemo(
    () =>
      filtered.map((p) => ({
        id: p.id,
        label: p.title,
        sublabel: p.client.name,
        start: new Date(p.createdAt),
        end: p.scheduledDate ? new Date(p.scheduledDate) : new Date(p.createdAt),
        color: POST_STATUS_COLORS[p.status],
        onClick: () => openEdit(p),
      })),
    [filtered],
  );

  return (
    <div>
      <PageHeader
        title="Aprovação de Posts"
        description="Envie posts para seus clientes aprovarem por link ou pelo portal do cliente"
        actions={
          <Button size="lg" onClick={openCreate}>
            <Plus size={16} /> Novo post
          </Button>
        }
      />

      <div className="mb-8">
        <StatPillRow
          items={[
            { label: "Total de posts", display: stats.total, tone: "dark", weight: stats.total },
            { label: "Pendentes", display: stats.pending, tone: "accent", weight: stats.pending },
            { label: "Aprovados", display: stats.approved, tone: "outline", weight: stats.approved },
            { label: "Alterações", display: stats.changes, tone: "hatch", weight: stats.changes },
          ]}
        />
      </div>

      <FilterBar className="justify-between">
        {view === "board" ? (
          <p className="text-[13px] font-medium text-muted px-1">
            Todos os status, agrupados por coluna
          </p>
        ) : (
          <FilterTabs tabs={TABS} value={statusTab} onChange={setStatusTab} />
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <FilterSelect
            icon={Building2}
            value={clientFilter ?? ""}
            onChange={(e) => setClientFilter(e.target.value || null)}
            className="max-w-[200px]"
          >
            <option value="">Todos os clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id} data-avatar-name={c.name} data-avatar-url={c.avatarUrl}>
                {c.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            icon={Layers}
            value={typeFilter ?? ""}
            onChange={(e) => setTypeFilter(e.target.value || null)}
            className="max-w-[180px]"
          >
            <option value="">Todo tipo</option>
            {demandTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </FilterSelect>
          <button
            type="button"
            onClick={() => setTypeManagerOpen(true)}
            title="Gerenciar tipos de demanda"
            className="text-muted hover:text-accent hover:bg-surface transition-colors p-2.5 rounded-full cursor-pointer flex-shrink-0"
          >
            <Settings2 size={16} />
          </button>
          {(clientFilter || typeFilter) && (
            <FilterClearButton
              onClick={() => {
                setClientFilter(null);
                setTypeFilter(null);
              }}
            />
          )}
        </div>
      </FilterBar>

      <div className="mb-6">
        <ViewTabs
          value={view}
          onChange={setView}
          options={[
            { key: "grid", label: "Grade", icon: LayoutGrid },
            { key: "board", label: "Quadro", icon: Kanban },
            { key: "feed", label: "Feed", icon: Grid3x3 },
            { key: "list", label: "Lista", icon: List },
            { key: "calendar", label: "Calendário", icon: CalendarDays },
            { key: "gantt", label: "Gantt", icon: GanttChartSquare },
          ]}
        />
      </div>

      {view === "list" && (
        <PostsListView posts={filtered} onRowClick={openEdit} />
      )}

      {view === "calendar" && <MiniCalendar events={calendarEvents} />}

      {view === "gantt" && <GanttChart rows={ganttRows} />}

      {view === "board" && (
        <div className="overflow-x-auto">
          <div className="flex gap-5 pb-2 min-w-max">
            {boardColumns.map((col) => (
              <div key={col.status} className="w-72 flex-shrink-0 flex flex-col gap-4">
                <div className="flex items-center gap-2.5 bg-surface rounded-full pl-1.5 pr-2 py-1.5 shadow-sm shadow-black/5">
                  <IconChip size="sm" tone={col.status === "PENDING" ? "accent" : "default"}>
                    <col.meta.icon size={14} strokeWidth={2} />
                  </IconChip>
                  <span className="text-[13px] font-semibold text-ink truncate">{col.meta.label}</span>
                  <span className="text-xs font-semibold text-muted bg-surface-2 rounded-full px-2.5 py-1 ml-auto">
                    {col.posts.length}
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {col.posts.length === 0 ? (
                    <div className="text-[13px] text-muted text-center py-10 bg-hatch border border-dotted border-border-2 rounded-3xl">
                      Nada por aqui
                    </div>
                  ) : (
                    col.posts.map((post) => {
                      const cover = post.attachments[0];
                      return (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => openEdit(post)}
                          className="text-left bg-surface rounded-card shadow-sm shadow-black/5 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer p-1.5"
                        >
                          <div className="relative aspect-video w-full bg-surface-2 rounded-[22px] overflow-hidden">
                            {cover && cover.type === "VIDEO" ? (
                              <video src={cover.url} className="w-full h-full object-cover" muted />
                            ) : cover ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={cover.url} alt={post.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-hatch flex items-center justify-center text-muted-2">
                                <ImagePlus size={18} strokeWidth={1.8} />
                              </div>
                            )}
                          </div>
                          <div className="px-3 pt-3 pb-2.5 flex flex-col gap-2">
                            <p className="text-sm font-semibold text-ink leading-snug line-clamp-2">{post.title}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-surface-2 text-muted max-w-full">
                                <Users size={10} className="flex-shrink-0" />
                                <span className="truncate">{post.client.name}</span>
                              </span>
                              {post.demandType && (
                                <span
                                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                                  style={{
                                    color: post.demandType.color,
                                    borderColor: `color-mix(in srgb, ${post.demandType.color} 40%, transparent)`,
                                  }}
                                >
                                  {post.demandType.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "feed" && (
        <div>
          <p className="text-[13px] font-medium text-muted mb-3 px-1">
            Ordenado pela data de agendamento - assim fica fácil ver como o feed vai ficar
          </p>
          {feedPosts.length === 0 ? (
            <Card padding="none">
              <EmptyState icon={<Grid3x3 size={20} />} title="Nenhum conteúdo para mostrar" description="Ajuste os filtros ou envie um novo post." />
            </Card>
          ) : (
            <Card padding="sm" className="max-w-2xl">
              <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden">
                {feedPosts.map((post) => {
                  const cover = post.attachments[0];
                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => openEdit(post)}
                      title={post.title}
                      className="relative aspect-square w-full bg-surface-2 overflow-hidden cursor-pointer group"
                    >
                      {cover && cover.type === "VIDEO" ? (
                        <video src={cover.url} className="w-full h-full object-cover" muted />
                      ) : cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover.url} alt={post.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-hatch flex items-center justify-center text-muted-2">
                          <ImagePlus size={18} strokeWidth={1.8} />
                        </div>
                      )}
                      <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-[11px] font-semibold px-2 text-center transition-opacity line-clamp-3">
                          {post.title}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {view === "grid" && (filtered.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<ImagePlus size={20} />}
            title={posts.length === 0 ? "Nenhum post enviado" : "Nenhum post encontrado"}
            description={
              posts.length === 0
                ? "Envie o primeiro post para um cliente aprovar."
                : "Tente ajustar os filtros."
            }
            action={
              posts.length === 0 && (
                <Button size="sm" onClick={openCreate}>
                  <Plus size={14} /> Novo post
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
          {filtered.map((post) => {
            const meta = STATUS_META[post.status];
            const cover = post.attachments[0];
            return (
              <Card
                key={post.id}
                padding="none"
                className="overflow-hidden flex flex-col group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <button
                  type="button"
                  onClick={() => openEdit(post)}
                  className="block w-full p-2 pb-0 cursor-pointer"
                >
                  <span className="relative block aspect-square w-full bg-surface-2 rounded-[22px] overflow-hidden">
                    {cover && cover.type === "VIDEO" ? (
                      <video src={cover.url} className="w-full h-full object-cover" muted />
                    ) : cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover.url} alt={post.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full bg-hatch flex items-center justify-center text-muted-2">
                        <ImagePlus size={24} strokeWidth={1.8} />
                      </span>
                    )}
                    {post.attachments.length > 1 && (
                      <span className="absolute top-3 right-3 bg-black/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                        +{post.attachments.length - 1}
                      </span>
                    )}
                  </span>
                </button>
                <div className="p-5 pt-4 flex flex-col gap-3 flex-1">
                  <button
                    type="button"
                    onClick={() => openEdit(post)}
                    className="text-[15px] font-semibold text-ink leading-snug line-clamp-2 text-left cursor-pointer hover:text-accent transition-colors"
                  >
                    {post.title}
                  </button>

                  <div className="flex flex-wrap gap-1.5 items-center">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {post.priority !== "MEDIUM" && (
                      <Badge tone={PRIORITY_TONE[post.priority]}>Prioridade {PRIORITY_LABELS[post.priority]}</Badge>
                    )}
                    {post.demandType && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                        style={{
                          color: post.demandType.color,
                          borderColor: `color-mix(in srgb, ${post.demandType.color} 40%, transparent)`,
                        }}
                      >
                        {post.demandType.name}
                      </span>
                    )}
                  </div>

                  {(post.status === "CHANGES_REQUESTED" || post.status === "REJECTED") && post.feedback && (
                    <p className="text-xs text-danger bg-danger/10 rounded-2xl px-3.5 py-2.5 line-clamp-3">
                      &ldquo;{post.feedback}&rdquo;
                    </p>
                  )}

                  {post.status === "APPROVED" && post.reviewedByName && (
                    <p className="text-xs text-success">Aprovado por {post.reviewedByName}</p>
                  )}
                  {post.createdBy && (
                    <p className="text-[11px] text-muted-2">Enviado por {post.createdBy.name}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-surface-2 text-ink max-w-full">
                      <Users size={10} className="flex-shrink-0" />
                      <span className="truncate">{post.client.name}</span>
                    </span>
                    {post.project && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-surface-2 text-muted max-w-full">
                        <FolderKanban size={10} className="flex-shrink-0" />
                        <span className="truncate">{post.project.name}</span>
                      </span>
                    )}
                  </div>

                  <DottedDivider className="mt-auto" />

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-2">{formatDate(post.createdAt)}</span>
                    <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                      <button
                        type="button"
                        title="Copiar link de aprovação"
                        onClick={() => copyLink(post)}
                        className="p-2 rounded-full text-muted hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer"
                      >
                        {copiedId === post.id ? <Check size={14} className="text-success" /> : <Link2 size={14} />}
                      </button>
                      <button
                        type="button"
                        title="Excluir"
                        onClick={() => handleDelete(post)}
                        className="p-2 rounded-full text-muted hover:text-danger hover:bg-surface-2 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ))}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar" : "Novo"}
        titleAccent="post"
        width="md"
      >
        <div className="flex flex-col gap-4">
          <Field label="Anexos" error={errors.attachments} hint="Fotos ou vídeos - o cliente pode aprovar ou pedir alteração de cada um">
            <AttachmentsField attachments={draftAttachments} onChange={setDraftAttachments} allowFiles={false} />
          </Field>

          <Field label="Título" error={errors.title}>
            <Input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Ex: Post de lançamento - Instagram"
            />
          </Field>

          <Field label="Legenda / descrição" hint="Opcional, o cliente verá esse texto junto da imagem">
            <Textarea
              value={draftCaption}
              onChange={(e) => setDraftCaption(e.target.value)}
              placeholder="Legenda do post..."
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Cliente" error={errors.clientId}>
              <Select
                value={draftClientId}
                onChange={(e) => {
                  setDraftClientId(e.target.value);
                  setDraftProjectId("");
                }}
              >
                <option value="">Selecione...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id} data-avatar-name={c.name} data-avatar-url={c.avatarUrl}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Projeto" hint="Opcional">
              <Select value={draftProjectId} onChange={(e) => setDraftProjectId(e.target.value)}>
                <option value="">Nenhum</option>
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Tipo de demanda" hint="Opcional">
            <div className="flex items-center gap-2">
              <Select value={draftDemandTypeId} onChange={(e) => setDraftDemandTypeId(e.target.value)} className="flex-1">
                <option value="">Nenhum</option>
                {demandTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setTypeManagerOpen(true)}
                title="Gerenciar tipos"
                className="text-muted hover:text-accent hover:bg-surface-2 transition-colors p-2.5 rounded-full cursor-pointer flex-shrink-0"
              >
                <Layers size={15} />
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Prioridade" hint="Define a ordem na fila de aprovação do cliente">
              <Select value={draftPriority} onChange={(e) => setDraftPriority(e.target.value as PostPriority)}>
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
              </Select>
            </Field>
            <Field label="Data agendada de publicação" hint="Opcional, usada nas visões de calendário e gantt">
              <Input
                type="date"
                value={draftScheduledDate}
                onChange={(e) => setDraftScheduledDate(e.target.value)}
              />
            </Field>
          </div>

          <DottedDivider className="mt-2" />

          <div className="flex justify-between gap-2">
            {editing ? (
              <Button type="button" variant="danger" onClick={() => handleDelete(editing)}>
                Excluir
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Salvando..." : editing ? "Salvar" : "Enviar"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <DemandTypeManager
        open={typeManagerOpen}
        onClose={() => setTypeManagerOpen(false)}
        types={demandTypes}
        onTypesChange={setDemandTypes}
      />
    </div>
  );
}
