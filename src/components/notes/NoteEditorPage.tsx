"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Repeat2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DottedDivider } from "@/components/ui/Dotted";
import { OrganizePicker, type OrganizeTarget } from "@/components/organizer/OrganizePicker";
import { BlockEditor } from "./BlockEditor";
import { parseBlocks, serializeBlocks, type Block } from "./blocks";
import { useNotesRefresh } from "./NotesShell";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type Option = { id: string; name: string };

type NoteRow = {
  id: string;
  title: string;
  content: string | null;
  folder: Option | null;
  client: Option | null;
  project: Option | null;
};

function orgTarget(note: NoteRow): OrganizeTarget {
  if (note.folder) return { mode: "folder", id: note.folder.id, label: note.folder.name };
  if (note.client) return { mode: "client", id: note.client.id, label: note.client.name };
  if (note.project) return { mode: "project", id: note.project.id, label: note.project.name };
  return { mode: "none", id: null, label: "Sem organização" };
}

export function NoteEditorPage({
  note,
  initialFolders,
  clients,
  projects,
}: {
  note: NoteRow;
  initialFolders: Option[];
  clients: Option[];
  projects: Option[];
}) {
  const router = useRouter();
  const refreshNotes = useNotesRefresh();
  const [title, setTitle] = useState(note.title);
  const { confirmDialog } = useConfirmDialog();
  const [blocks, setBlocks] = useState<Block[]>(() => parseBlocks(note.content));
  const [org, setOrg] = useState<OrganizeTarget>(() => orgTarget(note));
  const [folders, setFolders] = useState(initialFolders);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function handleAddFolder(name: string) {
    const res = await fetch("/api/pastas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, kind: "NOTE" }),
    });
    if (!res.ok) return null;
    const folder = await res.json();
    setFolders((prev) => [...prev, folder]);
    return folder;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        title: title.trim() || "Sem título",
        content: serializeBlocks(blocks),
        folderId: org.mode === "folder" ? org.id ?? "" : "",
        clientId: org.mode === "client" ? org.id ?? "" : "",
        projectId: org.mode === "project" ? org.id ?? "" : "",
      };
      const res = await fetch(`/api/notas/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSavedAt(Date.now());
        await refreshNotes();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!(await confirmDialog(`Remover a nota "${note.title}"?`, { confirmLabel: "Remover" }))) return;
    const res = await fetch(`/api/notas/${note.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/notas");
      await refreshNotes();
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Card padding="none" className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="px-5 sm:px-8 pt-5 pb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => router.push("/notas")}
              className="md:hidden inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} /> Notas
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
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : savedAt ? "Salvo ✓" : "Salvar"}
            </Button>
          </div>
        </div>

        <DottedDivider className="mx-5 sm:mx-8" />

        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-8">
          <div className="max-w-3xl w-full mx-auto">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da nota"
              className="w-full bg-transparent border-none outline-none text-3xl sm:text-4xl font-light tracking-tight leading-tight text-ink placeholder:text-muted-2 mb-8"
            />
            <BlockEditor blocks={blocks} onChange={setBlocks} />
          </div>
        </div>
      </Card>

      <OrganizePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onContinue={(target) => {
          setOrg(target);
          setPickerOpen(false);
        }}
        title="essa nota"
        folders={folders}
        clients={clients}
        projects={projects}
        onAddFolder={handleAddFolder}
      />
    </div>
  );
}
