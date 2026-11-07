"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  Users,
  Briefcase,
  Clock,
  CheckCircle2,
  Rocket,
  Star,
  Flag,
  Target,
  Zap,
  Crown,
  Trophy,
  Sparkles,
  Swords,
  Compass,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { AvatarUploadField } from "@/components/ui/AvatarUploadField";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatPillRow } from "@/components/ui/StatPills";
import { PillProgress } from "@/components/ui/PillProgress";
import { DottedDivider, DottedRow } from "@/components/ui/Dotted";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { cn } from "@/lib/cn";
import { COLUMN_COLOR_PRESETS } from "@/lib/colors";
import { healthColor, type SquadStats } from "@/lib/squadStats";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Checkbox } from "@/components/ui/Checkbox";

const SQUAD_ICONS: Record<string, LucideIcon> = {
  shield: Shield,
  rocket: Rocket,
  star: Star,
  flag: Flag,
  target: Target,
  zap: Zap,
  crown: Crown,
  trophy: Trophy,
  sparkles: Sparkles,
  swords: Swords,
  compass: Compass,
};
const SQUAD_ICON_KEYS = Object.keys(SQUAD_ICONS);

function squadIconFor(key: string | null): LucideIcon {
  return (key && SQUAD_ICONS[key]) || Shield;
}

type TeamMember = { id: string; name: string; role: string | null; avatarUrl: string | null };

type Squad = {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  color: string | null;
  icon: string | null;
  lead: TeamMember | null;
  members: TeamMember[];
  stats: SquadStats;
};

type FormState = {
  name: string;
  description: string;
  avatarUrl: string;
  color: string;
  icon: string;
  leadId: string;
  memberIds: string[];
};

const EMPTY: FormState = {
  name: "",
  description: "",
  avatarUrl: "",
  color: COLUMN_COLOR_PRESETS[0],
  icon: "shield",
  leadId: "",
  memberIds: [],
};

function squadColorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return COLUMN_COLOR_PRESETS[hash % COLUMN_COLOR_PRESETS.length];
}

export function SquadsView({
  initialSquads,
  teamMembers,
}: {
  initialSquads: Squad[];
  teamMembers: TeamMember[];
}) {
  const [squads, setSquads] = useState<Squad[]>(initialSquads);
  const [modalOpen, setModalOpen] = useState(false);
  const { confirmDialog } = useConfirmDialog();
  const [editing, setEditing] = useState<Squad | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, color: COLUMN_COLOR_PRESETS[squads.length % COLUMN_COLOR_PRESETS.length] });
    setModalOpen(true);
  }

  function openEdit(squad: Squad) {
    setEditing(squad);
    setForm({
      name: squad.name,
      description: squad.description ?? "",
      avatarUrl: squad.avatarUrl ?? "",
      color: squad.color ?? squadColorFor(squad.id),
      icon: squad.icon ?? "shield",
      leadId: squad.lead?.id ?? "",
      memberIds: squad.members.map((m) => m.id),
    });
    setModalOpen(true);
  }

  function toggleMember(id: string) {
    setForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(id) ? f.memberIds.filter((m) => m !== id) : [...f.memberIds, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const url = editing ? `/api/squads/${editing.id}` : "/api/squads";
    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) return;
    const raw = await res.json();
    const saved: Squad = {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      avatarUrl: raw.avatarUrl,
      color: raw.color,
      icon: raw.icon,
      lead: raw.lead,
      members: raw.members.map((m: { teamMember: TeamMember }) => m.teamMember),
      stats: editing?.stats ?? {
        progress: 0,
        healthScore: 100,
        totalHours: 0,
        daysRemaining: null,
        totalCards: 0,
        completedCards: 0,
        activeProjectsCount: 0,
      },
    };
    setSquads((list) => (editing ? list.map((s) => (s.id === saved.id ? saved : s)) : [...list, saved]));
    setModalOpen(false);
  }

  async function handleDelete(id: string) {
    if (!(await confirmDialog("Excluir este squad? Os projetos ficarão sem squad.", { confirmLabel: "Excluir" }))) return;
    setSquads((list) => list.filter((s) => s.id !== id));
    await fetch(`/api/squads/${id}`, { method: "DELETE" });
  }

  const totals = {
    members: squads.reduce((n, s) => n + s.members.length, 0),
    activeProjects: squads.reduce((n, s) => n + s.stats.activeProjectsCount, 0),
    completedCards: squads.reduce((n, s) => n + s.stats.completedCards, 0),
  };

  return (
    <div>
      <PageHeader
        title="Squads"
        description="Visão geral dos times, progresso e saúde de cada squad."
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} /> Novo squad
          </Button>
        }
      />

      {squads.length > 0 && (
        <StatPillRow
          className="mb-8"
          items={[
            { label: "Squads", display: squads.length, tone: "dark", weight: squads.length },
            { label: "Membros alocados", display: totals.members, tone: "accent", weight: totals.members },
            { label: "Projetos ativos", display: totals.activeProjects, tone: "hatch", weight: totals.activeProjects },
            { label: "Cards concluídos", display: totals.completedCards, tone: "outline", weight: totals.completedCards },
          ]}
        />
      )}

      {squads.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<Shield size={20} />}
            title="Nenhum squad criado"
            description="Agrupe pessoas da Equipe em squads para acompanhar progresso e saúde dos times."
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus size={14} /> Novo squad
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {squads.map((squad) => {
            const { stats } = squad;
            const hColor = healthColor(stats.healthScore);
            const sColor = squad.color ?? squadColorFor(squad.id);
            const Icon = squadIconFor(squad.icon);
            return (
              <Card
                key={squad.id}
                padding="none"
                className="group overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex flex-col"
              >
                <div className="p-6 pb-0 flex items-start gap-3">
                  {squad.avatarUrl ? (
                    <Avatar name={squad.name} url={squad.avatarUrl} size={56} className="flex-shrink-0" />
                  ) : (
                    <span
                      className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `color-mix(in srgb, ${sColor} 22%, var(--color-surface))`,
                        color: sColor,
                      }}
                    >
                      <Icon size={22} strokeWidth={1.8} />
                    </span>
                  )}
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-[17px] font-semibold text-ink truncate">{squad.name}</p>
                    {squad.description && (
                      <p className="text-[13px] text-muted line-clamp-2 mt-0.5">{squad.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(squad)}
                      className="text-muted hover:text-accent p-1.5 rounded-full hover:bg-surface-2 transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(squad.id)}
                      className="text-muted hover:text-danger p-1.5 rounded-full hover:bg-surface-2 transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="px-6 pb-6 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-[13px] text-muted truncate">{squad.lead ? `Líder: ${squad.lead.name}` : "Sem líder"}</p>
                    {squad.members.length > 0 && (
                      <div className="flex items-center -space-x-2 flex-shrink-0">
                        {squad.members.slice(0, 4).map((m) => (
                          <Avatar
                            key={m.id}
                            name={m.name}
                            url={m.avatarUrl}
                            size={22}
                            className="ring-2 ring-surface text-[9px]"
                          />
                        ))}
                        {squad.members.length > 4 && (
                          <span className="min-w-[22px] h-[22px] px-1 rounded-full bg-surface-3 text-muted text-[9px] font-semibold flex items-center justify-center ring-2 ring-surface">
                            +{squad.members.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-medium text-muted">Progresso</span>
                      <span className="text-xs text-muted-2">
                        {stats.daysRemaining != null ? `${stats.daysRemaining} dias restantes` : "Sem prazo ativo"}
                      </span>
                    </div>
                    <PillProgress value={stats.progress} label={`${stats.progress}%`} />
                  </div>

                  <DottedRow
                    className="mt-4"
                    label="Health Score"
                    value={
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: hColor }} />
                        {stats.healthScore}
                      </span>
                    }
                  />

                  <div className="mt-auto pt-5">
                    <DottedDivider />
                    <div className="grid grid-cols-4 gap-2 pt-4">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[22px] font-light leading-none tracking-tight text-ink">{squad.members.length}</span>
                        <Users size={13} className="text-muted-2" />
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[22px] font-light leading-none tracking-tight text-ink">{stats.activeProjectsCount}</span>
                        <Briefcase size={13} className="text-muted-2" />
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[22px] font-light leading-none tracking-tight text-ink">{stats.totalHours}</span>
                        <Clock size={13} className="text-muted-2" />
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[22px] font-light leading-none tracking-tight text-ink">{stats.completedCards}</span>
                        <CheckCircle2 size={13} className="text-muted-2" />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar squad" : "Novo squad"} width="md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Foto do squad">
            <AvatarUploadField
              name={form.name || "Squad"}
              value={form.avatarUrl || null}
              onChange={(dataUrl) => set("avatarUrl", dataUrl ?? "")}
            />
          </Field>

          <Field label="Nome do squad">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Squad Alpha" required autoFocus />
          </Field>

          <Field label="Pequena descrição" hint="Opcional">
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Ex: Time responsável pelas contas de e-commerce"
              rows={2}
              className="min-h-0"
            />
          </Field>

          <Field label="Ícone do squad" hint="Usado como avatar quando não há foto">
            <div className="flex flex-wrap gap-2">
              {SQUAD_ICON_KEYS.map((key) => {
                const Icon = SQUAD_ICONS[key];
                const active = form.icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set("icon", key)}
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors",
                      active ? "text-black" : "bg-surface-2 text-muted hover:text-ink",
                    )}
                    style={active ? { background: form.color } : undefined}
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Cor do squad">
            <div className="flex flex-wrap gap-2">
              {COLUMN_COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color", c)}
                  className={cn(
                    "w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 flex items-center justify-center",
                    form.color === c && "ring-2 ring-offset-2 ring-offset-surface",
                  )}
                  style={{ background: c, ...(form.color === c ? { boxShadow: `0 0 0 2px ${c}` } : {}) }}
                >
                  {form.color === c && <span className="w-2 h-2 rounded-full bg-white" />}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Líder">
            <Select value={form.leadId} onChange={(e) => set("leadId", e.target.value)} className="rounded-xl">
              <option value="">Nenhum</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id} data-avatar-name={m.name} data-avatar-url={m.avatarUrl}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Membros">
            <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto bg-surface-2 rounded-2xl p-2.5">
              {teamMembers.length === 0 ? (
                <p className="text-xs text-muted-2 px-2 py-1">Nenhum membro de equipe cadastrado.</p>
              ) : (
                teamMembers.map((m) => (
                  <label
                    key={m.id}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-colors",
                      form.memberIds.includes(m.id) ? "bg-accent/15" : "hover:bg-surface-3",
                    )}
                  >
                    <Checkbox checked={form.memberIds.includes(m.id)} onChange={() => toggleMember(m.id)} />
                    <Avatar name={m.name} url={m.avatarUrl} size={22} className="text-[10px] flex-shrink-0" />
                    <span className="text-sm text-ink flex-1 min-w-0 truncate">{m.name}</span>
                    {m.role && <span className="text-xs text-muted-2 flex-shrink-0">{m.role}</span>}
                  </label>
                ))
              )}
            </div>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
