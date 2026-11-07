"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, FolderKanban, CircleDot, Building2 } from "lucide-react";
import { projectSchema, type ProjectInput, type ProjectFormValues } from "@/lib/schemas";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StatPillRow } from "@/components/ui/StatPills";
import { PillProgress } from "@/components/ui/PillProgress";
import { DottedDivider, DottedRow } from "@/components/ui/Dotted";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { FilterBar, FilterSearch, FilterSelect, FilterClearButton } from "@/components/ui/FilterBar";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE } from "@/lib/labels";
import { cn } from "@/lib/cn";
import { COVER_GRADIENTS, coverGradientByColor } from "@/lib/coverGradient";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: "PLANNING" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELED";
  value: number | null;
  startDate: string | null;
  dueDate: string | null;
  coverColor: string | null;
  client: { id: string; name: string };
  service: { id: string; name: string } | null;
  squad: { id: string; name: string } | null;
};

type Option = { id: string; name: string };

/** "YYYY-MM-DD" de hoje no fuso local - comparado como string, não como Date. */
function todayLocalISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function isOverdue(project: ProjectRow) {
  if (!project.dueDate) return false;
  if (project.status === "DONE" || project.status === "CANCELED") return false;
  // Comparação por string de data, não `new Date(...)`: dueDate chega como ISO
  // UTC (meia-noite do dia escolhido), então comparar objetos Date direto
  // contra "hoje" em horário local marcava todo prazo de hoje como atrasado
  // o dia inteiro em fusos negativos (ex: Brasil, UTC-3) - mesmo bug já
  // corrigido em FinanceView.tsx.
  return project.dueDate.slice(0, 10) < todayLocalISODate();
}

/** Percentual do tempo decorrido entre início e prazo, apenas apresentação. */
function timelinePct(project: ProjectRow) {
  if (!project.startDate || !project.dueDate) return null;
  if (project.status === "DONE" || project.status === "CANCELED") return null;
  const start = new Date(project.startDate).getTime();
  const end = new Date(project.dueDate).getTime();
  if (!(end > start)) return null;
  const pct = ((Date.now() - start) / (end - start)) * 100;
  return Math.round(Math.min(Math.max(pct, 0), 100));
}

export function ProjectsView({
  initialProjects,
  clients,
  services,
  squads,
}: {
  initialProjects: ProjectRow[];
  clients: (Option & { avatarUrl: string | null })[];
  services: (Option & { defaultPrice: number })[];
  squads: Option[];
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const { confirmDialog } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [coverColor, setCoverColor] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues, unknown, ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: { status: "PLANNING" },
  });

  function openCreate() {
    setEditing(null);
    setCoverColor(COVER_GRADIENTS[0].key);
    reset({
      name: "",
      description: "",
      status: "PLANNING",
      clientId: clients[0]?.id ?? "",
      serviceId: "",
      squadId: "",
      value: undefined,
      startDate: toDateInputValue(new Date()),
      dueDate: "",
    });
    setModalOpen(true);
  }

  function openEdit(project: ProjectRow) {
    setEditing(project);
    setCoverColor(project.coverColor);
    reset({
      name: project.name,
      description: project.description ?? "",
      status: project.status,
      clientId: project.client.id,
      serviceId: project.service?.id ?? "",
      squadId: project.squad?.id ?? "",
      value: project.value ?? undefined,
      startDate: toDateInputValue(project.startDate),
      dueDate: toDateInputValue(project.dueDate),
    });
    setModalOpen(true);
  }

  async function onSubmit(data: ProjectInput) {
    setSubmitting(true);
    try {
      const url = editing ? `/api/projetos/${editing.id}` : "/api/projetos";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, coverColor: coverColor ?? "" }),
      });
      if (!res.ok) throw new Error("Falha ao salvar projeto");
      setModalOpen(false);
      const updated = await fetch("/api/projetos").then((r) => r.json());
      setProjects(updated);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(project: ProjectRow) {
    if (!(await confirmDialog(`Remover o projeto "${project.name}"?`, { confirmLabel: "Remover" }))) return;
    const res = await fetch(`/api/projetos/${project.id}`, { method: "DELETE" });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      router.refresh();
    }
  }

  const stats = useMemo(
    () => ({
      total: projects.length,
      inProgress: projects.filter((p) => p.status === "IN_PROGRESS").length,
      done: projects.filter((p) => p.status === "DONE").length,
      overdue: projects.filter(isOverdue).length,
    }),
    [projects],
  );

  const filtered = useMemo(() => {
    return projects
      .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
      .filter((p) => !statusFilter || p.status === statusFilter)
      .filter((p) => !clientFilter || p.client.id === clientFilter);
  }, [projects, search, statusFilter, clientFilter]);

  return (
    <div>
      <PageHeader
        title="Projetos"
        description="Projetos em andamento por cliente"
        actions={
          clients.length > 0 && (
            <Button onClick={openCreate}>
              <Plus size={16} /> Novo projeto
            </Button>
          )
        }
      />

      {clients.length > 0 && projects.length > 0 && (
        <StatPillRow
          className="mb-8"
          items={[
            { label: "Total de projetos", display: stats.total, tone: "dark", weight: stats.total },
            { label: "Em andamento", display: stats.inProgress, tone: "accent", weight: stats.inProgress },
            { label: "Concluídos", display: stats.done, tone: "hatch", weight: stats.done },
            {
              label: "Atrasados",
              display:
                stats.overdue > 0 ? (
                  <span className="text-danger">{stats.overdue}</span>
                ) : (
                  stats.overdue
                ),
              tone: "outline",
              weight: stats.overdue,
            },
          ]}
        />
      )}

      {clients.length > 0 && projects.length > 0 && (
        <FilterBar>
          <FilterSearch
            placeholder="Buscar projeto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <FilterSelect icon={CircleDot} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-44">
            <option value="">Todos os status</option>
            <option value="PLANNING">Planejamento</option>
            <option value="IN_PROGRESS">Em andamento</option>
            <option value="REVIEW">Revisão</option>
            <option value="DONE">Concluído</option>
            <option value="CANCELED">Cancelado</option>
          </FilterSelect>
          <FilterSelect icon={Building2} value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="max-w-48">
            <option value="">Todos os clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id} data-avatar-name={c.name} data-avatar-url={c.avatarUrl}>{c.name}</option>
            ))}
          </FilterSelect>
          {(search || statusFilter || clientFilter) && (
            <FilterClearButton
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setClientFilter("");
              }}
            />
          )}
        </FilterBar>
      )}

      {clients.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<FolderKanban size={20} />}
            title="Cadastre um cliente primeiro"
            description="Você precisa de ao menos um cliente para criar projetos."
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<FolderKanban size={20} />}
            title={projects.length === 0 ? "Nenhum projeto cadastrado" : "Nenhum projeto encontrado"}
            description={
              projects.length === 0
                ? "Crie o primeiro projeto vinculado a um cliente."
                : "Tente ajustar a busca ou os filtros."
            }
            action={
              projects.length === 0 && (
                <Button size="sm" onClick={openCreate}>
                  <Plus size={14} /> Novo projeto
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filtered.map((project) => {
            const timeline = timelinePct(project);
            return (
              <Card
                key={project.id}
                padding="none"
                className="overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex flex-col"
              >
                <div className="p-3 pb-0">
                  <div className="relative h-32 rounded-[20px] overflow-hidden">
                    <div className={cn("absolute inset-0 bg-gradient-to-br", coverGradientByColor(project.coverColor, project.id))} />
                    <div className="absolute top-3 right-3 flex items-center gap-1">
                      <button
                        onClick={() => openEdit(project)}
                        className="text-white bg-black/30 hover:bg-black/50 p-2 rounded-full backdrop-blur-sm transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(project)}
                        className="text-white bg-black/30 hover:bg-danger p-2 rounded-full backdrop-blur-sm transition-colors cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                      <Badge tone={PROJECT_STATUS_TONE[project.status]} className="shadow-sm">
                        {PROJECT_STATUS_LABELS[project.status]}
                      </Badge>
                      {isOverdue(project) && (
                        <Badge tone="danger" className="shadow-sm">Atrasado</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 flex-1 flex flex-col">
                  <div className="relative w-fit -mt-8 mb-4">
                    <div className="w-14 h-14 rounded-full bg-ink text-accent border-4 border-surface flex items-center justify-center shadow-md">
                      <FolderKanban size={22} strokeWidth={1.8} />
                    </div>
                  </div>

                  <p className="text-[17px] font-semibold text-ink truncate">{project.name}</p>

                  <p className="text-[13px] text-muted truncate mt-1">
                    {project.client.name}
                    {project.service && ` · ${project.service.name}`}
                  </p>

                  {project.value != null && (
                    <div className="mt-5">
                      <p className="text-[13px] font-medium text-muted">Valor</p>
                      <p className="text-[26px] font-light tracking-tight leading-none text-ink mt-1.5">
                        {formatCurrency(project.value)}
                      </p>
                    </div>
                  )}

                  {project.dueDate && (
                    <DottedRow
                      className="mt-4"
                      label="Prazo"
                      value={
                        <span className={cn(isOverdue(project) && "text-danger font-semibold")}>
                          {formatDate(project.dueDate)}
                        </span>
                      }
                    />
                  )}

                  {timeline != null && (
                    <PillProgress
                      className="mt-4"
                      value={timeline}
                      label={`${timeline}%`}
                      size="sm"
                      tone="dark"
                    />
                  )}

                  {project.squad && (
                    <div className="mt-auto pt-5">
                      <DottedDivider />
                      <div className="pt-4">
                        <Badge tone="accent">{project.squad.name}</Badge>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar" : "Novo"}
        titleAccent="projeto"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <p className="text-[13px] font-medium text-muted mb-2">Cor de capa</p>
            <div
              className={cn(
                "h-16 w-full rounded-2xl bg-gradient-to-br",
                coverGradientByColor(coverColor, editing?.id ?? "new"),
              )}
            />
            <div className="flex flex-wrap gap-2 mt-2.5">
              {COVER_GRADIENTS.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  title="Escolher degradê"
                  onClick={() => setCoverColor(g.key)}
                  className={cn(
                    "w-7 h-7 rounded-full bg-gradient-to-br cursor-pointer transition-transform hover:scale-110",
                    g.classes,
                    coverColor === g.key && "ring-2 ring-offset-2 ring-offset-surface ring-ink",
                  )}
                />
              ))}
            </div>
          </div>

          <Field label="Nome do projeto" error={errors.name?.message}>
            <Input {...register("name")} placeholder="Ex: Campanha de lançamento" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliente" error={errors.clientId?.message}>
              <Select {...register("clientId")}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id} data-avatar-name={c.name} data-avatar-url={c.avatarUrl}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Serviço">
              <Select {...register("serviceId")}>
                <option value="">Nenhum</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select {...register("status")}>
                <option value="PLANNING">Planejamento</option>
                <option value="IN_PROGRESS">Em andamento</option>
                <option value="REVIEW">Revisão</option>
                <option value="DONE">Concluído</option>
                <option value="CANCELED">Cancelado</option>
              </Select>
            </Field>
            <Field label="Valor (opcional)">
              <Input type="number" step="0.01" min="0" {...register("value")} placeholder="Usar valor do serviço" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Início">
              <Input type="date" {...register("startDate")} />
            </Field>
            <Field label="Prazo">
              <Input type="date" {...register("dueDate")} />
            </Field>
          </div>

          <Field label="Squad (opcional)">
            <Select {...register("squadId")}>
              <option value="">Nenhum</option>
              {squads.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Descrição">
            <Textarea {...register("description")} placeholder="Detalhes do projeto..." />
          </Field>

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
