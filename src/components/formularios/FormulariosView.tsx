"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Link2, Check, Pencil, Trash2, ExternalLink, FormInput, ListChecks, BarChart3 } from "lucide-react";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconChip } from "@/components/ui/IconChip";
import { StatPillRow } from "@/components/ui/StatPills";
import { DottedDivider } from "@/components/ui/Dotted";
import { FormSubmissionsModal } from "./FormSubmissionsModal";
import { copyToClipboard } from "@/lib/clipboard";
import type { FormSummary } from "./types";

export function FormulariosView({ initialForms }: { initialForms: FormSummary[] }) {
  const [forms, setForms] = useState(initialForms);
  const { confirmDialog } = useConfirmDialog();
  const [submissionsFor, setSubmissionsFor] = useState<FormSummary | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      total: forms.length,
      active: forms.filter((f) => f.active).length,
      submissions: forms.reduce((sum, f) => sum + f._count.submissions, 0),
    }),
    [forms],
  );

  function copyLink(form: FormSummary) {
    const url = `${window.location.origin}/formulario/${form.token}`;
    copyToClipboard(url);
    setCopiedId(form.id);
    setTimeout(() => setCopiedId((id) => (id === form.id ? null : id)), 1800);
  }

  async function handleDelete(id: string) {
    if (!(await confirmDialog("Excluir este formulário e todas as respostas recebidas?", { confirmLabel: "Excluir" }))) return;
    const res = await fetch(`/api/formularios/${id}`, { method: "DELETE" });
    if (res.ok) setForms((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div>
      <PageHeader
        title="Formulários"
        description="Crie formulários personalizados para briefings, pesquisas e coleta de informações."
        actions={
          <Link
            href="/ferramentas/formularios/novo"
            className="inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors cursor-pointer px-6 py-3 text-sm bg-accent text-black hover:bg-accent-light"
          >
            <Plus size={15} /> Novo formulário
          </Link>
        }
      />

      {forms.length > 0 && (
        <StatPillRow
          className="mb-8"
          items={[
            { label: "Formulários", display: stats.total, tone: "dark", weight: stats.total },
            { label: "Ativos", display: stats.active, tone: "accent", weight: stats.active },
            { label: "Respostas", display: stats.submissions, tone: "hatch", weight: stats.submissions },
          ]}
        />
      )}

      {forms.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<FormInput size={20} />}
            title="Nenhum formulário ainda"
            description="Crie o primeiro formulário para coletar briefings, pesquisas ou informações de clientes."
            action={
              <Link
                href="/ferramentas/formularios/novo"
                className="inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors cursor-pointer px-5 py-2.5 text-sm bg-accent text-black hover:bg-accent-light"
              >
                <Plus size={15} /> Novo formulário
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {forms.map((f) => (
            <Card key={f.id} padding="lg" className="flex flex-col gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-3">
                <IconChip tone="accent" size="lg">
                  <FormInput size={20} strokeWidth={1.8} />
                </IconChip>
                <Badge tone={f.active ? "success" : "muted"}>{f.active ? "Ativo" : "Inativo"}</Badge>
              </div>

              <div>
                <h3 className="text-[17px] font-semibold text-ink leading-snug">{f.title}</h3>
                {f.description && <p className="text-xs text-muted mt-1.5 line-clamp-2">{f.description}</p>}
                <p className="text-[13px] text-muted-2 mt-1.5">{f.client?.name ?? "Sem cliente vinculado"}</p>
              </div>

              <div className="flex items-end gap-8 mt-auto">
                <div className="flex flex-col gap-1">
                  <span className="text-[28px] font-light leading-none tracking-tight text-ink">{f._count.fields}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <ListChecks size={12} /> {f._count.fields === 1 ? "campo" : "campos"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmissionsFor(f)}
                  className="flex flex-col gap-1 text-left cursor-pointer group"
                >
                  <span className="text-[28px] font-light leading-none tracking-tight text-accent">
                    {f._count.submissions}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted group-hover:text-accent transition-colors">
                    <BarChart3 size={12} /> {f._count.submissions === 1 ? "resposta" : "respostas"}
                  </span>
                </button>
              </div>

              <DottedDivider />

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => copyLink(f)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-ink bg-surface-2 hover:bg-surface-3 rounded-full py-2.5 cursor-pointer transition-colors"
                  title="Copiar link"
                >
                  {copiedId === f.id ? <Check size={13} className="text-success" /> : <Link2 size={13} />}
                  {copiedId === f.id ? "Copiado" : "Copiar link"}
                </button>
                <a
                  href={`/formulario/${f.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-muted hover:text-accent hover:bg-surface-2 cursor-pointer transition-colors"
                  title="Abrir"
                >
                  <ExternalLink size={14} />
                </a>
                <Link
                  href={`/ferramentas/formularios/${f.id}`}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-muted hover:text-accent hover:bg-surface-2 cursor-pointer transition-colors"
                  title="Editar"
                >
                  <Pencil size={14} />
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(f.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-muted hover:text-danger hover:bg-danger/10 cursor-pointer transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <FormSubmissionsModal
        open={submissionsFor !== null}
        onClose={() => setSubmissionsFor(null)}
        formId={submissionsFor?.id ?? null}
        formTitle={submissionsFor?.title ?? ""}
      />
    </div>
  );
}
