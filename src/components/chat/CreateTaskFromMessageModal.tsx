"use client";

import { useEffect, useState } from "react";
import { MessagesSquare } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { IconChip } from "@/components/ui/IconChip";
import { cn } from "@/lib/cn";

type Board = { id: string; name: string; client: { id: string; name: string } | null };
type Column = { id: string; name: string; boardId: string };

export function CreateTaskFromMessageModal({
  open,
  onClose,
  message,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  message: { text: string; clientId: string | null; clientName: string | null } | null;
  onCreated?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [boards, setBoards] = useState<Board[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [boardId, setBoardId] = useState("");
  const [columnId, setColumnId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !message) return;
    setTitle(message.text.slice(0, 80));
    setDescription(message.text);
    setPriority("MEDIUM");
    setError(null);
    setColumns([]);
    setColumnId("");

    fetch("/api/kanban/boards")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Board[]) => {
        setBoards(data);
        const clientBoard = message.clientId ? data.find((b) => b.client?.id === message.clientId) : null;
        setBoardId(clientBoard?.id ?? data[0]?.id ?? "");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, message]);

  useEffect(() => {
    if (!boardId) {
      setColumns([]);
      setColumnId("");
      return;
    }
    fetch(`/api/kanban/columns?boardId=${boardId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Column[]) => {
        setColumns(data);
        setColumnId(data[0]?.id ?? "");
      });
  }, [boardId]);

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    if (!message) return;
    setError(null);
    if (!title.trim()) {
      setError("Informe o título da tarefa");
      return;
    }
    if (!columnId) {
      setError("Selecione uma coluna");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/kanban/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description,
          priority,
          columnId,
          clientId: message.clientId || "",
        }),
      });
      if (res.ok) {
        onCreated?.();
        handleClose();
      } else {
        setError("Não foi possível criar a tarefa");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nova tarefa" titleAccent="a partir da mensagem">
      <div className="flex flex-col gap-5">
        {message?.clientName && (
          <div className="self-start flex items-center gap-3 bg-surface-2 rounded-full pl-1.5 pr-5 py-1.5">
            <IconChip tone="accent" size="sm">
              <MessagesSquare size={14} />
            </IconChip>
            <p className="text-xs text-muted">
              Solicitação de <span className="text-ink font-semibold">{message.clientName}</span>
            </p>
          </div>
        )}

        <Field label="Título">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da tarefa" />
        </Field>

        <Field label="Descrição">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Quadro">
            <Select value={boardId} onChange={(e) => setBoardId(e.target.value)}>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Coluna">
            <Select value={columnId} onChange={(e) => setColumnId(e.target.value)} disabled={columns.length === 0}>
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Prioridade">
          <div className="flex gap-1.5">
            {([
              { key: "LOW", label: "Baixa" },
              { key: "MEDIUM", label: "Média" },
              { key: "HIGH", label: "Alta" },
            ] as const).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPriority(p.key)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer",
                  priority === p.key ? "bg-accent text-black" : "bg-surface-2 text-muted hover:text-ink",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex justify-end gap-2 mt-1">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Criando..." : "Criar tarefa"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
