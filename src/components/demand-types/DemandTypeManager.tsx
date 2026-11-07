"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X as XIcon } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { IconChip } from "@/components/ui/IconChip";
import { DottedDivider } from "@/components/ui/Dotted";
import { COLUMN_COLOR_PRESETS } from "@/lib/colors";
import { cn } from "@/lib/cn";
import type { DemandTypeOption } from "@/components/kanban/types";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="grid grid-cols-9 gap-1.5">
      {COLUMN_COLOR_PRESETS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "w-5 h-5 rounded-full cursor-pointer ring-2 transition-transform hover:scale-110",
            value === c ? "ring-ink" : "ring-transparent",
          )}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

export function DemandTypeManager({
  open,
  onClose,
  types,
  onTypesChange,
}: {
  open: boolean;
  onClose: () => void;
  types: DemandTypeOption[];
  onTypesChange: (next: DemandTypeOption[]) => void;
}) {
  const [newName, setNewName] = useState("");
  const { confirmDialog, alertDialog } = useConfirmDialog();
  const [newColor, setNewColor] = useState(COLUMN_COLOR_PRESETS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tipos-demanda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      if (res.ok) {
        const type = await res.json();
        onTypesChange([...types, type]);
        setNewName("");
        setNewColor(COLUMN_COLOR_PRESETS[0]);
      }
    } finally {
      setCreating(false);
    }
  }

  function startEdit(type: DemandTypeOption) {
    setEditingId(type.id);
    setEditingName(type.name);
    setEditingColor(type.color);
  }

  async function handleSaveEdit() {
    if (!editingId || !editingName.trim()) return;
    const res = await fetch(`/api/tipos-demanda/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName.trim(), color: editingColor }),
    });
    if (res.ok) {
      const updated = await res.json();
      onTypesChange(types.map((t) => (t.id === updated.id ? updated : t)));
      setEditingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirmDialog("Remover este tipo de demanda?", { confirmLabel: "Remover" }))) return;
    const res = await fetch(`/api/tipos-demanda/${id}`, { method: "DELETE" });
    if (res.ok) {
      onTypesChange(types.filter((t) => t.id !== id));
      if (editingId === id) setEditingId(null);
    } else {
      const data = await res.json().catch(() => null);
      await alertDialog(data?.error || "Não foi possível remover esse tipo de demanda.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Tipos de" titleAccent="demanda" width="sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto -mx-1 px-1">
          {types.length === 0 && (
            <div className="rounded-3xl bg-hatch border border-dotted border-border-2 py-8">
              <p className="text-xs text-muted-2 text-center">Nenhum tipo cadastrado ainda.</p>
            </div>
          )}
          {types.map((type) =>
            editingId === type.id ? (
              <div key={type.id} className="flex flex-col gap-2.5 bg-surface-2 rounded-3xl p-3.5">
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 min-w-0 bg-surface rounded-full px-4 py-2 text-sm text-ink outline-none border border-transparent focus:border-accent transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-success hover:bg-surface cursor-pointer flex-shrink-0"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-surface cursor-pointer flex-shrink-0"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
                <ColorPicker value={editingColor} onChange={setEditingColor} />
              </div>
            ) : (
              <div
                key={type.id}
                className="group flex items-center gap-3 px-3 py-2 rounded-full hover:bg-surface-2 transition-colors"
              >
                <span
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ background: `color-mix(in srgb, ${type.color} 15%, transparent)` }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: type.color }} />
                </span>
                <span className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">{type.name}</span>
                <button
                  type="button"
                  onClick={() => startEdit(type)}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-accent transition-opacity p-1 cursor-pointer"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(type.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-opacity p-1 cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ),
          )}
        </div>

        <DottedDivider />

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <IconChip size="sm" tone="accent">
              <Plus size={14} strokeWidth={2} />
            </IconChip>
            <p className="text-base font-semibold text-ink">Novo tipo</p>
          </div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Ex: Post, Material gráfico, Landing page..."
            className="bg-surface-2 rounded-full px-5 py-2.5 text-sm text-ink outline-none border border-transparent focus:border-accent transition-colors placeholder:text-muted-2"
          />
          <ColorPicker value={newColor} onChange={setNewColor} />
          <Button type="button" size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
            <Plus size={14} /> Adicionar tipo
          </Button>
        </div>
      </div>
    </Modal>
  );
}
