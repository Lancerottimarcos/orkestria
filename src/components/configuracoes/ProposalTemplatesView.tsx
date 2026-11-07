"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, Trash2, Pencil, Star, Wand2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/PageHeader";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PROPOSAL_TEMPLATE_KINDS, type ProposalTemplateKind } from "@/lib/proposals/proposalTemplateFactory";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

type TemplateRow = { id: string; name: string; updatedAt: string; isDefault: boolean };

function GenerateReadyTemplateMenu({ onGenerated }: { onGenerated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState<ProposalTemplateKind | null>(null);

  async function handlePick(kind: ProposalTemplateKind) {
    setGenerating(kind);
    try {
      const res = await fetch("/api/configuracoes/propostas-modelos/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (res.ok) {
        const template = await res.json();
        onGenerated(template.id);
      }
    } finally {
      setGenerating(null);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <Button variant="ghost" type="button" onClick={() => setOpen((v) => !v)}>
        <Wand2 size={14} /> Gerar modelo pronto
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1.5 z-50 bg-surface rounded-2xl shadow-2xl shadow-black/20 p-2 w-64">
            {PROPOSAL_TEMPLATE_KINDS.map(({ kind, name }) => (
              <button
                key={kind}
                type="button"
                disabled={generating !== null}
                onClick={() => handlePick(kind)}
                className={cn(
                  "w-full text-left text-xs font-medium text-ink hover:bg-surface-2 rounded-xl px-3 py-2.5 transition-colors cursor-pointer disabled:opacity-60",
                )}
              >
                {generating === kind ? "Gerando..." : name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ProposalTemplatesView({ initialTemplates }: { initialTemplates: TemplateRow[] }) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [creating, setCreating] = useState(false);
  const { confirmDialog, alertDialog } = useConfirmDialog();

  async function createTemplate() {
    setCreating(true);
    try {
      const res = await fetch("/api/configuracoes/propostas-modelos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Novo modelo de proposta", bodyJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }) }),
      });
      if (!res.ok) {
        await alertDialog("Não foi possível criar o modelo");
        return;
      }
      const template = await res.json();
      router.push(`/configuracoes/propostas/${template.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(template: TemplateRow) {
    if (!(await confirmDialog(`Excluir o modelo "${template.name}"?`, { confirmLabel: "Excluir" }))) return;
    setTemplates((list) => list.filter((t) => t.id !== template.id));
    await fetch(`/api/configuracoes/propostas-modelos/${template.id}`, { method: "DELETE" });
  }

  return (
    <>
      <div className="flex justify-end gap-2 mb-5">
        <GenerateReadyTemplateMenu onGenerated={(id) => router.push(`/configuracoes/propostas/${id}`)} />
        <Button onClick={createTemplate} disabled={creating}>
          <Plus size={14} /> Novo modelo
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<FileText size={20} strokeWidth={1.8} />}
            title="Nenhum modelo de proposta ainda"
            description="Crie um modelo reutilizável com variáveis do cliente, ou gere um dos modelos prontos."
            action={
              <Button size="sm" onClick={createTemplate} disabled={creating}>
                <Plus size={14} /> Novo modelo
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} padding="none" className="overflow-hidden flex flex-col group">
              <Link href={`/configuracoes/propostas/${template.id}`} className="p-5 flex-1 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                    <FileText size={18} strokeWidth={1.8} />
                  </span>
                  {template.isDefault && (
                    <Badge tone="accent" icon={<Star size={11} />}>
                      Padrão
                    </Badge>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{template.name}</p>
                  <p className="text-xs text-muted-2 mt-0.5">Atualizado em {formatDate(template.updatedAt)}</p>
                </div>
              </Link>
              <div className="flex items-center gap-1 px-5 pb-4">
                <Link
                  href={`/configuracoes/propostas/${template.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <Pencil size={12} /> Editar
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(template)}
                  className="ml-auto p-1.5 rounded-full text-muted hover:text-danger hover:bg-surface-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
                  title="Excluir"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
