"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUp, ArrowDown, Plus, Trash2, Check, Star } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";

type Card_ = { id?: string; title: string };
type Column = { id?: string; name: string; color?: string | null; cards: Card_[] };
type Template = { id: string; name: string; description: string | null; isDefault: boolean; columns: Column[] };

function move<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const next = [...list];
  const target = index + dir;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function BoardTemplateEditorScreen({ template }: { template: Template }) {
  const router = useRouter();
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [isDefault, setIsDefault] = useState(template.isDefault);
  const [columns, setColumns] = useState<Column[]>(template.columns.length ? template.columns : [{ name: "A Fazer", cards: [] }]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateColumn(index: number, patch: Partial<Column>) {
    setColumns((prev) => prev.map((col, i) => (i === index ? { ...col, ...patch } : col)));
  }

  function addColumn() {
    setColumns((prev) => [...prev, { name: "", cards: [] }]);
  }

  function removeColumn(index: number) {
    setColumns((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function addCard(columnIndex: number) {
    updateColumn(columnIndex, { cards: [...columns[columnIndex].cards, { title: "" }] });
  }

  function updateCard(columnIndex: number, cardIndex: number, title: string) {
    const cards = columns[columnIndex].cards.map((c, i) => (i === cardIndex ? { ...c, title } : c));
    updateColumn(columnIndex, { cards });
  }

  function removeCard(columnIndex: number, cardIndex: number) {
    updateColumn(columnIndex, { cards: columns[columnIndex].cards.filter((_, i) => i !== cardIndex) });
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/configuracoes/quadros/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          isDefault,
          columns: columns
            .filter((c) => c.name.trim())
            .map((c) => ({ name: c.name, color: c.color || undefined, cards: c.cards.filter((card) => card.title.trim()) })),
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/configuracoes/quadros"
            className="p-2 rounded-full text-muted hover:text-accent hover:bg-surface-2 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={16} />
          </Link>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="text-lg font-semibold max-w-xs sm:max-w-sm" />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saved ? (
            <>
              <Check size={14} /> Salvo
            </>
          ) : saving ? (
            "Salvando..."
          ) : (
            "Salvar modelo"
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
        <Card>
          <p className="text-sm font-semibold text-ink mb-4">Colunas</p>
          <div className="flex flex-col gap-4">
            {columns.map((col, i) => (
              <div key={i} className="rounded-card bg-surface-2/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Input value={col.name} onChange={(e) => updateColumn(i, { name: e.target.value })} placeholder="Nome da coluna" className="flex-1" />
                  <button
                    type="button"
                    onClick={() => setColumns((prev) => move(prev, i, -1))}
                    disabled={i === 0}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-accent hover:bg-surface-2 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setColumns((prev) => move(prev, i, 1))}
                    disabled={i === columns.length - 1}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-accent hover:bg-surface-2 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeColumn(i)}
                    disabled={columns.length === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-danger hover:bg-danger/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex flex-col gap-1.5 pl-1">
                  {col.cards.map((card, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <Input
                        value={card.title}
                        onChange={(e) => updateCard(i, j, e.target.value)}
                        placeholder="Título do card inicial"
                        className="flex-1 h-8 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeCard(i, j)}
                        className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full text-muted hover:text-danger hover:bg-danger/10 cursor-pointer transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addCard(i)}
                    className="mt-1 self-start inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:text-accent-dark cursor-pointer transition-colors"
                  >
                    <Plus size={11} /> Card inicial
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addColumn}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 hover:bg-accent/15 rounded-full px-4 py-2 cursor-pointer transition-colors"
          >
            <Plus size={13} /> Adicionar coluna
          </button>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <p className="text-sm font-semibold text-ink mb-4">Configurações</p>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-medium text-muted mb-1.5">Descrição</p>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Pra quando usar esse modelo..." rows={3} />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                <span className="text-sm text-ink flex items-center gap-1.5">
                  <Star size={13} className="text-accent" /> Usar como modelo padrão
                </span>
              </label>
              <p className="text-xs text-muted-2 -mt-1">
                O modelo padrão é usado automaticamente pra abrir o quadro do cliente quando um contrato é assinado.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
