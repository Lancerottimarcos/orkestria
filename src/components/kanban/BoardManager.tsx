"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check, X as XIcon, LayoutGrid } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { IconChip } from "@/components/ui/IconChip";
import { DottedDivider } from "@/components/ui/Dotted";
import type { KanbanBoardData, ClientOption } from "./types";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

export function BoardManager({
  open,
  onClose,
  boards,
  onBoardsChange,
  clients,
}: {
  open: boolean;
  onClose: () => void;
  boards: KanbanBoardData[];
  onBoardsChange: (next: KanbanBoardData[]) => void;
  clients: ClientOption[];
}) {
  const [newName, setNewName] = useState("");
  const { confirmDialog } = useConfirmDialog();
  const [newClientId, setNewClientId] = useState("");
  const [newTemplateId, setNewTemplateId] = useState("");
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingClientId, setEditingClientId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/configuracoes/quadros")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setTemplates(Array.isArray(list) ? list.map((t) => ({ id: t.id, name: t.name })) : []))
      .catch(() => setTemplates([]));
  }, [open]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/kanban/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), clientId: newClientId, templateId: newTemplateId }),
      });
      if (res.ok) {
        const board = await res.json();
        onBoardsChange([...boards, board]);
        setNewName("");
        setNewClientId("");
        setNewTemplateId("");
      }
    } finally {
      setCreating(false);
    }
  }

  function startEdit(board: KanbanBoardData) {
    setEditingId(board.id);
    setEditingName(board.name);
    setEditingClientId(board.client?.id ?? "");
    setError("");
  }

  async function handleSaveEdit() {
    if (!editingId || !editingName.trim()) return;
    const res = await fetch(`/api/kanban/boards/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName.trim(), clientId: editingClientId }),
    });
    if (res.ok) {
      const updated = await res.json();
      onBoardsChange(boards.map((b) => (b.id === updated.id ? updated : b)));
      setEditingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (boards.length <= 1) {
      setError("Você precisa manter ao menos um quadro");
      return;
    }
    const counts = await fetch(`/api/kanban/boards/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    const message = counts?.cardCount > 0
      ? `Remover este quadro? ${counts.columnCount} coluna(s) e ${counts.cardCount} demanda(s) - com todo o histórico delas - serão perdidas junto.`
      : "Remover este quadro e todas as colunas nele?";
    if (!(await confirmDialog(message, { confirmLabel: "Remover" }))) return;
    const res = await fetch(`/api/kanban/boards/${id}`, { method: "DELETE" });
    if (res.ok) {
      onBoardsChange(boards.filter((b) => b.id !== id));
      if (editingId === id) setEditingId(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Gerenciar" titleAccent="quadros" width="sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto -mx-1 px-1">
          {boards.length === 0 && (
            <div className="rounded-3xl bg-hatch border border-dotted border-border-2 py-8">
              <p className="text-xs text-muted-2 text-center">Nenhum quadro cadastrado ainda.</p>
            </div>
          )}
          {boards.map((board) =>
            editingId === board.id ? (
              <div key={board.id} className="flex flex-col gap-2.5 bg-surface-2 rounded-3xl p-3.5">
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
                <Select value={editingClientId} onChange={(e) => setEditingClientId(e.target.value)} className="text-sm bg-surface border-transparent">
                  <option value="">Nenhum cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id} data-avatar-name={c.name} data-avatar-url={c.avatarUrl}>{c.name}</option>
                  ))}
                </Select>
              </div>
            ) : (
              <div
                key={board.id}
                className="group flex items-center gap-3 px-3 py-2 rounded-full hover:bg-surface-2 transition-colors"
              >
                <IconChip size="sm">
                  <LayoutGrid size={14} strokeWidth={1.8} />
                </IconChip>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-ink truncate">{board.name}</span>
                  {board.client && (
                    <span className="block text-[11px] text-muted-2 truncate">{board.client.name}</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(board)}
                  title="Renomear quadro"
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted hover:text-accent transition-opacity p-1 cursor-pointer"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(board.id)}
                  title="Remover quadro"
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted hover:text-danger transition-opacity p-1 cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ),
          )}
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <DottedDivider />

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <IconChip size="sm" tone="accent">
              <Plus size={14} strokeWidth={2} />
            </IconChip>
            <p className="text-base font-semibold text-ink">Novo quadro</p>
          </div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Ex: Posts, Landing Pages, Tráfego pago..."
            className="bg-surface-2 rounded-full px-5 py-2.5 text-sm text-ink outline-none border border-transparent focus:border-accent transition-colors placeholder:text-muted-2"
          />
          <Select value={newClientId} onChange={(e) => setNewClientId(e.target.value)}>
            <option value="">Nenhum cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id} data-avatar-name={c.name} data-avatar-url={c.avatarUrl}>{c.name}</option>
            ))}
          </Select>
          {templates.length > 0 && (
            <Select value={newTemplateId} onChange={(e) => setNewTemplateId(e.target.value)}>
              <option value="">Colunas em branco</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>A partir de &quot;{t.name}&quot;</option>
              ))}
            </Select>
          )}
          <Button type="button" size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
            <Plus size={14} /> Adicionar quadro
          </Button>
        </div>
      </div>
    </Modal>
  );
}
