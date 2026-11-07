"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Users, AtSign, ThumbsUp, ThumbsDown, Lightbulb, Swords, Tag as TagIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";
import { AvatarUploadField } from "@/components/ui/AvatarUploadField";
import { Card } from "@/components/ui/Card";
import { DottedDivider } from "@/components/ui/Dotted";
import { IconChip } from "@/components/ui/IconChip";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/PageHeader";
import { COMPETITOR_TYPE_OPTIONS } from "@/lib/labels";

type Competitor = {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  followers: string | null;
  frequency: string | null;
  type: string | null;
  sells: string | null;
  differential: string | null;
  niche: string | null;
  strengths: string | null;
  weaknesses: string | null;
  opportunities: string | null;
};

type FormState = {
  name: string;
  handle: string;
  avatarUrl: string;
  followers: string;
  frequency: string;
  type: string;
  sells: string;
  differential: string;
  niche: string;
  strengths: string;
  weaknesses: string;
  opportunities: string;
};

const EMPTY: FormState = {
  name: "",
  handle: "",
  avatarUrl: "",
  followers: "",
  frequency: "",
  type: "",
  sells: "",
  differential: "",
  niche: "",
  strengths: "",
  weaknesses: "",
  opportunities: "",
};

export function CompetitorsPanel({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Competitor | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/clientes/${clientId}/concorrentes`)
      .then((r) => r.json())
      .then((data) => setCompetitors(data))
      .finally(() => setLoading(false));
  }, [clientId]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(c: Competitor) {
    setEditing(c);
    setForm({
      name: c.name,
      handle: c.handle ?? "",
      avatarUrl: c.avatarUrl ?? "",
      followers: c.followers ?? "",
      frequency: c.frequency ?? "",
      type: c.type ?? "",
      sells: c.sells ?? "",
      differential: c.differential ?? "",
      niche: c.niche ?? "",
      strengths: c.strengths ?? "",
      weaknesses: c.weaknesses ?? "",
      opportunities: c.opportunities ?? "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const url = editing
      ? `/api/clientes/${clientId}/concorrentes/${editing.id}`
      : `/api/clientes/${clientId}/concorrentes`;
    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) return;
    const saved = await res.json();
    setCompetitors((list) =>
      editing ? list.map((c) => (c.id === saved.id ? saved : c)) : [...list, saved],
    );
    setModalOpen(false);
  }

  async function handleDelete(id: string) {
    setCompetitors((list) => list.filter((c) => c.id !== id));
    await fetch(`/api/clientes/${clientId}/concorrentes/${id}`, { method: "DELETE" });
  }

  return (
    <div className="flex flex-col gap-5">
      <Card padding="md" className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <IconChip tone="accent" size="lg">
            <Swords size={20} strokeWidth={1.8} />
          </IconChip>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-ink">Mapa de concorrentes</h2>
            <p className="text-sm text-muted mt-0.5">Compare posicionamento, conteúdo e diferenciais.</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Novo concorrente
        </Button>
      </Card>

      {loading ? (
        <p className="text-sm text-muted">Carregando concorrentes...</p>
      ) : competitors.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<Users size={20} strokeWidth={1.8} />}
            title="Nenhum concorrente mapeado"
            description="Adicione os principais concorrentes deste cliente para comparar estratégias."
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus size={14} /> Novo concorrente
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {competitors.map((c) => {
            const typeTone =
              c.type === "Direto" ? "bg-danger/12 text-danger" : c.type === "Indireto" ? "bg-accent/15 text-accent-light" : "bg-success/12 text-success";
            return (
              <Card key={c.id} padding="md" className="group hover:shadow-md transition-shadow flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <Avatar name={c.name} url={c.avatarUrl} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{c.name}</p>
                    {c.handle && (
                      <p className="text-xs text-muted flex items-center gap-1 truncate">
                        <AtSign size={11} /> {c.handle}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(c)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-danger hover:bg-surface-2 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {c.type && <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full", typeTone)}>{c.type}</span>}
                  {c.niche && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-3 text-muted inline-flex items-center gap-1">
                      <TagIcon size={10} /> {c.niche}
                    </span>
                  )}
                  {c.followers && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-3 text-muted">
                      {c.followers} seguidores
                    </span>
                  )}
                  {c.frequency && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-3 text-muted">
                      Posta {c.frequency.toLowerCase()}
                    </span>
                  )}
                </div>

                {c.sells && (
                  <p className="text-xs text-muted">
                    <span className="font-semibold text-ink">Vende: </span>
                    {c.sells}
                  </p>
                )}
                {c.differential && (
                  <p className="text-xs text-muted line-clamp-2">
                    <span className="font-semibold text-ink">Diferencial: </span>
                    {c.differential}
                  </p>
                )}

                {(c.strengths || c.weaknesses || c.opportunities) && (
                  <>
                    <DottedDivider />
                    <div className="flex flex-col gap-1.5">
                      {c.strengths && (
                        <p className="text-[11px] text-success flex items-start gap-1.5">
                          <ThumbsUp size={12} className="flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{c.strengths}</span>
                        </p>
                      )}
                      {c.weaknesses && (
                        <p className="text-[11px] text-danger flex items-start gap-1.5">
                          <ThumbsDown size={12} className="flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{c.weaknesses}</span>
                        </p>
                      )}
                      {c.opportunities && (
                        <p className="text-[11px] text-accent-light flex items-start gap-1.5">
                          <Lightbulb size={12} className="flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{c.opportunities}</span>
                        </p>
                      )}
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar concorrente" : "Novo concorrente"} width="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <AvatarUploadField name={form.name || "?"} value={form.avatarUrl || null} onChange={(v) => set("avatarUrl", v ?? "")} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required autoFocus />
            </Field>
            <Field label="@ do Instagram">
              <Input value={form.handle} onChange={(e) => set("handle", e.target.value)} placeholder="@concorrente" />
            </Field>
            <Field label="Seguidores">
              <Input value={form.followers} onChange={(e) => set("followers", e.target.value)} placeholder="120K" />
            </Field>
            <Field label="Frequência de postagem">
              <Input value={form.frequency} onChange={(e) => set("frequency", e.target.value)} placeholder="Diária" />
            </Field>
            <Field label="Tipo">
              <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
                <option value="">Selecione</option>
                {COMPETITOR_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Nicho">
              <Input value={form.niche} onChange={(e) => set("niche", e.target.value)} placeholder="Ex: mães empreendedoras" />
            </Field>
          </div>
          <Field label="O que vende">
            <Input value={form.sells} onChange={(e) => set("sells", e.target.value)} placeholder="Consultoria, mentoria, produto..." />
          </Field>
          <Field label="Diferencial percebido">
            <Textarea value={form.differential} onChange={(e) => set("differential", e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Pontos fortes">
              <Textarea value={form.strengths} onChange={(e) => set("strengths", e.target.value)} />
            </Field>
            <Field label="Pontos fracos">
              <Textarea value={form.weaknesses} onChange={(e) => set("weaknesses", e.target.value)} />
            </Field>
          </div>
          <Field label="Oportunidades para nós">
            <Textarea value={form.opportunities} onChange={(e) => set("opportunities", e.target.value)} placeholder="O que podemos explorar que ele não faz" />
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
