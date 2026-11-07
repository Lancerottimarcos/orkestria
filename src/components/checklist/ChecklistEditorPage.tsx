"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Repeat2, Plus, Check, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, Panel } from "@/components/ui/Card";
import { DottedDivider } from "@/components/ui/Dotted";
import { PillProgress } from "@/components/ui/PillProgress";
import { Field, Input } from "@/components/ui/Input";
import { OrganizePicker, type OrganizeTarget } from "@/components/organizer/OrganizePicker";
import { useChecklistRefresh } from "./ChecklistShell";
import { cn } from "@/lib/cn";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type Option = { id: string; name: string };
type ItemRow = { id: string; text: string; done: boolean };

type ChecklistRow = {
  id: string;
  title: string;
  folder: Option | null;
  client: Option | null;
  project: Option | null;
  items: ItemRow[];
};

function orgTarget(checklist: ChecklistRow): OrganizeTarget {
  if (checklist.folder) return { mode: "folder", id: checklist.folder.id, label: checklist.folder.name };
  if (checklist.client) return { mode: "client", id: checklist.client.id, label: checklist.client.name };
  if (checklist.project) return { mode: "project", id: checklist.project.id, label: checklist.project.name };
  return { mode: "none", id: null, label: "Sem organização" };
}

function ChecklistItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ItemRow;
  onToggle: (item: ItemRow) => void;
  onDelete: (item: ItemRow) => void;
}) {
  return (
    <div className="group flex items-center gap-3.5 py-3 border-b border-dotted border-panel-2 last:border-0">
      <button
        type="button"
        onClick={() => onToggle(item)}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all duration-200",
          item.done ? "bg-success border-success" : "border-panel-2 hover:border-accent",
        )}
      >
        <Check
          size={12}
          strokeWidth={3}
          className={cn(
            "text-black transition-all duration-200",
            item.done ? "opacity-100 scale-100" : "opacity-0 scale-50",
          )}
        />
      </button>
      <span className={cn("flex-1 min-w-0 text-sm transition-colors duration-200", item.done ? "text-panel-muted line-through" : "text-panel-ink")}>
        {item.text}
      </span>
      <button
        type="button"
        onClick={() => onDelete(item)}
        className="opacity-0 group-hover:opacity-100 text-panel-muted hover:text-danger transition-opacity flex-shrink-0 cursor-pointer"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export function ChecklistEditorPage({
  checklist,
  initialFolders,
  clients,
  projects,
}: {
  checklist: ChecklistRow;
  initialFolders: Option[];
  clients: Option[];
  projects: Option[];
}) {
  const router = useRouter();
  const refreshChecklists = useChecklistRefresh();
  const [title, setTitle] = useState(checklist.title);
  const { confirmDialog } = useConfirmDialog();
  const [items, setItems] = useState(checklist.items);
  const [org, setOrg] = useState<OrganizeTarget>(() => orgTarget(checklist));
  const [folders, setFolders] = useState(initialFolders);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);

  async function handleAddFolder(name: string) {
    const res = await fetch("/api/pastas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, kind: "CHECKLIST" }),
    });
    if (!res.ok) return null;
    const folder = await res.json();
    setFolders((prev) => [...prev, folder]);
    return folder;
  }

  async function handleSaveDetails(nextOrg?: OrganizeTarget) {
    setSaving(true);
    try {
      const target = nextOrg ?? org;
      const payload = {
        title: title.trim() || "Sem título",
        folderId: target.mode === "folder" ? target.id ?? "" : "",
        clientId: target.mode === "client" ? target.id ?? "" : "",
        projectId: target.mode === "project" ? target.id ?? "" : "",
      };
      const res = await fetch(`/api/checklists/${checklist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSavedAt(Date.now());
        await refreshChecklists();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!(await confirmDialog(`Remover a checklist "${checklist.title}"?`, { confirmLabel: "Remover" }))) return;
    const res = await fetch(`/api/checklists/${checklist.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/checklist");
      await refreshChecklists();
    }
  }

  async function handleAddItem() {
    if (!newItemText.trim()) return;
    const res = await fetch(`/api/checklists/${checklist.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newItemText.trim() }),
    });
    if (res.ok) {
      const item = await res.json();
      setItems((prev) => [...prev, item]);
      setNewItemText("");
      await refreshChecklists();
    }
  }

  async function handleToggleItem(item: ItemRow) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
    await fetch(`/api/checklists/${checklist.id}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !item.done }),
    });
    await refreshChecklists();
  }

  async function handleDeleteItem(item: ItemRow) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await fetch(`/api/checklists/${checklist.id}/items/${item.id}`, { method: "DELETE" });
    await refreshChecklists();
  }

  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const pct = total > 0 ? (done / total) * 100 : 0;
  const pendingItems = items.filter((i) => !i.done);
  const completedItems = items.filter((i) => i.done);

  return (
    <div className="h-full flex flex-col">
      <Card padding="none" className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="px-5 sm:px-8 pt-5 pb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => router.push("/checklist")}
              className="md:hidden inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} /> Checklist
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 min-w-0 max-w-full text-xs font-semibold px-3.5 py-2 rounded-full bg-surface-2 text-muted hover:text-accent hover:bg-surface-3 transition-colors duration-200 cursor-pointer"
            >
              <Repeat2 size={12} className="flex-shrink-0" />
              <span className="truncate">{org.mode === "none" ? "Sem organização" : org.label}</span>
              <span className="flex-shrink-0">· trocar</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 size={13} /> Excluir
            </Button>
            <Button type="button" size="sm" onClick={() => handleSaveDetails()} disabled={saving}>
              {saving ? "Salvando..." : savedAt ? "Salvo ✓" : "Salvar"}
            </Button>
          </div>
        </div>

        <DottedDivider className="mx-5 sm:mx-8" />

        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-8">
          <div className="max-w-2xl w-full mx-auto flex flex-col gap-8">
            <Field label="Título">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Checklist onboarding cliente"
                className="text-base font-semibold"
              />
            </Field>

            <div className="flex flex-col gap-3">
              <div className="flex items-end justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <p className="text-[13px] font-medium text-muted">Progresso</p>
                  <p
                    className={cn(
                      "text-[32px] font-light tracking-tight leading-none",
                      pct === 100 ? "text-success" : "text-ink",
                    )}
                  >
                    {Math.round(pct)}%
                  </p>
                </div>
                <p className="text-xs text-muted pb-1">
                  {total > 0 ? `${done} de ${total} itens concluídos` : "Nenhum item ainda"}
                </p>
              </div>
              <PillProgress
                value={pct}
                label={total > 0 ? `${done}/${total}` : undefined}
                tone="accent"
                size="sm"
              />
            </div>

            <Panel padding="md" className="flex flex-col">
              <div className="flex flex-col">
                {pendingItems.map((item) => (
                  <ChecklistItemRow key={item.id} item={item} onToggle={handleToggleItem} onDelete={handleDeleteItem} />
                ))}

                <div className="flex items-center gap-3.5 py-3">
                  <button
                    type="button"
                    onClick={() => document.getElementById("new-checklist-item-input")?.focus()}
                    className="w-5 h-5 rounded-full border-2 border-dashed border-panel-2 flex items-center justify-center flex-shrink-0 text-panel-muted hover:border-accent hover:text-accent transition-colors duration-200 cursor-pointer"
                  >
                    <Plus size={12} />
                  </button>
                  <input
                    id="new-checklist-item-input"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddItem();
                      }
                    }}
                    placeholder="Adicionar tarefa..."
                    className="flex-1 bg-transparent border-none outline-none text-sm text-panel-ink placeholder:text-panel-muted py-1"
                  />
                  {newItemText.trim() && (
                    <Button type="button" size="sm" onClick={handleAddItem}>
                      Adicionar
                    </Button>
                  )}
                </div>
              </div>

              {completedItems.length > 0 && (
                <div className="mt-3 pt-3 border-t border-dotted border-panel-2">
                  <button
                    type="button"
                    onClick={() => setShowCompleted((v) => !v)}
                    className="flex items-center gap-2 text-[13px] font-medium text-panel-muted hover:text-panel-ink transition-colors cursor-pointer py-1"
                  >
                    {showCompleted ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    Concluídos
                    <span className="text-[11px] font-semibold bg-panel-2 text-panel-ink rounded-full px-2 py-0.5">
                      {completedItems.length}
                    </span>
                  </button>
                  {showCompleted && (
                    <div className="flex flex-col mt-1">
                      {completedItems.map((item) => (
                        <ChecklistItemRow key={item.id} item={item} onToggle={handleToggleItem} onDelete={handleDeleteItem} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </Card>

      <OrganizePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onContinue={(target) => {
          setOrg(target);
          setPickerOpen(false);
          void handleSaveDetails(target);
        }}
        title="essa checklist"
        folders={folders}
        clients={clients}
        projects={projects}
        onAddFolder={handleAddFolder}
      />
    </div>
  );
}
