"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Columns3, Trash2, Pencil, Star } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/PageHeader";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type TemplateRow = { id: string; name: string; description: string | null; isDefault: boolean; columns: { id: string }[] };

export function BoardTemplatesView({ initialTemplates }: { initialTemplates: TemplateRow[] }) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [creating, setCreating] = useState(false);
  const { confirmDialog, alertDialog } = useConfirmDialog();

  async function createTemplate() {
    setCreating(true);
    try {
      const res = await fetch("/api/configuracoes/quadros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Novo modelo de quadro", columns: [{ name: "A Fazer" }, { name: "Em andamento" }, { name: "Concluído" }] }),
      });
      if (!res.ok) {
        await alertDialog("Não foi possível criar o modelo");
        return;
      }
      const template = await res.json();
      router.push(`/configuracoes/quadros/${template.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(template: TemplateRow) {
    if (!(await confirmDialog(`Excluir o modelo "${template.name}"?`, { confirmLabel: "Excluir" }))) return;
    setTemplates((list) => list.filter((t) => t.id !== template.id));
    await fetch(`/api/configuracoes/quadros/${template.id}`, { method: "DELETE" });
  }

  return (
    <>
      <div className="flex justify-end mb-5">
        <Button onClick={createTemplate} disabled={creating}>
          <Plus size={14} /> Novo modelo
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<Columns3 size={20} strokeWidth={1.8} />}
            title="Nenhum modelo de quadro ainda"
            description="Crie um modelo com colunas e cards iniciais pra abrir quadros já organizados - manualmente ou pela automação de propostas."
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
              <Link href={`/configuracoes/quadros/${template.id}`} className="p-5 flex-1 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                    <Columns3 size={18} strokeWidth={1.8} />
                  </span>
                  {template.isDefault && (
                    <Badge tone="accent" icon={<Star size={11} />}>
                      Padrão
                    </Badge>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{template.name}</p>
                  <p className="text-xs text-muted-2 mt-0.5">{template.columns.length} colunas</p>
                </div>
              </Link>
              <div className="flex items-center gap-1 px-5 pb-4">
                <Link
                  href={`/configuracoes/quadros/${template.id}`}
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
