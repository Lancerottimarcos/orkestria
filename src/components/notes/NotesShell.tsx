"use client";

import { createContext, Fragment, ReactNode, useContext, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Plus, Trash2, Search, NotebookText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconChip } from "@/components/ui/IconChip";
import { DottedDivider } from "@/components/ui/Dotted";
import { EmptyState } from "@/components/ui/PageHeader";
import { GroupSidebar, type GroupMode } from "@/components/organizer/GroupSidebar";
import { OrganizePicker, type OrganizeTarget } from "@/components/organizer/OrganizePicker";
import { blocksPreviewText } from "./blocks";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type Option = { id: string; name: string };

type NoteRow = {
  id: string;
  title: string;
  content: string | null;
  updatedAt: string;
  folder: Option | null;
  client: Option | null;
  project: Option | null;
};

const NONE = "__none__";

const NotesRefreshContext = createContext<() => Promise<unknown>>(async () => {});
export function useNotesRefresh() {
  return useContext(NotesRefreshContext);
}

export function NotesShell({
  initialNotes,
  initialFolders,
  clients,
  projects,
  children,
}: {
  initialNotes: NoteRow[];
  initialFolders: Option[];
  clients: Option[];
  projects: Option[];
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const activeId = pathname?.split("/notas/")[1] ?? null;

  const [notes, setNotes] = useState(initialNotes);
  const { confirmDialog } = useConfirmDialog();
  const [folders, setFolders] = useState(initialFolders);
  const [mode, setMode] = useState<GroupMode>("folder");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    const updated = await fetch("/api/notas").then((r) => r.json());
    setNotes(updated);
    router.refresh();
    return updated as NoteRow[];
  }

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

  async function handleRenameFolder(id: string, name: string) {
    const res = await fetch(`/api/pastas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
      router.refresh();
    }
  }

  async function handleDeleteFolder(id: string) {
    if (!(await confirmDialog("Remover esta pasta? As notas nela ficarão sem pasta.", { confirmLabel: "Remover" }))) return;
    const res = await fetch(`/api/pastas/${id}`, { method: "DELETE" });
    if (res.ok) {
      setFolders((prev) => prev.filter((f) => f.id !== id));
      if (selectedGroupId === id) setSelectedGroupId(null);
      await refresh();
    }
  }

  async function handlePickerContinue(target: OrganizeTarget) {
    setPickerOpen(false);
    setCreating(true);
    try {
      const payload = {
        title: "Nova nota",
        content: "",
        folderId: target.mode === "folder" ? target.id ?? "" : "",
        clientId: target.mode === "client" ? target.id ?? "" : "",
        projectId: target.mode === "project" ? target.id ?? "" : "",
      };
      const res = await fetch("/api/notas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const note = await res.json();
        setNotes((prev) => [note, ...prev]);
        router.push(`/notas/${note.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(note: NoteRow) {
    if (!(await confirmDialog(`Remover a nota "${note.title}"?`, { confirmLabel: "Remover" }))) return;
    const res = await fetch(`/api/notas/${note.id}`, { method: "DELETE" });
    if (res.ok) {
      if (activeId === note.id) router.push("/notas");
      await refresh();
    }
  }

  const groups = useMemo(() => {
    const source = mode === "folder" ? folders : mode === "client" ? clients : projects;
    const base = source.map((s) => ({
      id: s.id,
      name: s.name,
      count: notes.filter((n) => {
        const ref = mode === "folder" ? n.folder : mode === "client" ? n.client : n.project;
        return ref?.id === s.id;
      }).length,
    }));
    const noneCount = notes.filter((n) => {
      const ref = mode === "folder" ? n.folder : mode === "client" ? n.client : n.project;
      return !ref;
    }).length;
    if (noneCount > 0) {
      base.push({
        id: NONE,
        name: mode === "folder" ? "Sem pasta" : mode === "client" ? "Sem cliente" : "Sem projeto",
        count: noneCount,
      });
    }
    return base;
  }, [mode, folders, clients, projects, notes]);

  const filtered = useMemo(() => {
    return notes
      .filter((n) => {
        if (selectedGroupId === null) return true;
        const ref = mode === "folder" ? n.folder : mode === "client" ? n.client : n.project;
        if (selectedGroupId === NONE) return !ref;
        return ref?.id === selectedGroupId;
      })
      .filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          blocksPreviewText(n.content).toLowerCase().includes(search.toLowerCase()),
      );
  }, [notes, mode, selectedGroupId, search]);

  return (
    <NotesRefreshContext.Provider value={refresh}>
    <div className="flex gap-5 h-[calc(100vh-4rem)]">
      <div
        className={cn(
          "w-full md:w-80 flex-shrink-0 bg-surface rounded-card shadow-sm shadow-black/5 flex-col overflow-hidden",
          activeId ? "hidden md:flex" : "flex",
        )}
      >
        <div className="px-5 pt-6 pb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <IconChip tone="accent" size="sm">
              <NotebookText size={15} strokeWidth={2} />
            </IconChip>
            <h2 className="text-base font-semibold text-ink">Notas</h2>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={creating}
            title="Nova nota"
            className="w-10 h-10 rounded-full bg-accent text-black hover:bg-accent-light transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            <Plus size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="px-4 pb-4 flex flex-col gap-4">
          <div className="relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-2" />
            <Input
              placeholder="Buscar nota..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <GroupSidebar
            embedded
            mode={mode}
            onModeChange={(m) => {
              setMode(m);
              setSelectedGroupId(null);
            }}
            groups={groups}
            selectedGroupId={selectedGroupId}
            onSelectGroup={setSelectedGroupId}
            onAddFolder={mode === "folder" ? (name) => void handleAddFolder(name) : undefined}
            onRenameFolder={mode === "folder" ? handleRenameFolder : undefined}
            onDeleteFolder={mode === "folder" ? handleDeleteFolder : undefined}
          />
        </div>

        <DottedDivider className="mx-4" />

        <div className="flex-1 overflow-y-auto p-3 flex flex-col">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<NotebookText size={20} strokeWidth={1.8} />}
              title={notes.length === 0 ? "Nenhuma nota ainda" : "Nenhuma nota encontrada"}
              description={
                notes.length === 0
                  ? "Crie sua primeira nota para guardar ideias, briefings e referências."
                  : "Ajuste a busca ou o filtro para encontrar o que procura."
              }
              action={
                notes.length === 0 ? (
                  <Button type="button" size="sm" onClick={() => setPickerOpen(true)} disabled={creating}>
                    <Plus size={13} /> Nova nota
                  </Button>
                ) : undefined
              }
            />
          ) : (
            filtered.map((note, i) => {
              const active = activeId === note.id;
              return (
                <Fragment key={note.id}>
                  {i > 0 && <DottedDivider className="mx-4 my-1" />}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/notas/${note.id}`)}
                    onKeyDown={(e) => e.key === "Enter" && router.push(`/notas/${note.id}`)}
                    className={cn(
                      "group text-left px-4 py-3.5 rounded-3xl flex flex-col gap-1.5 transition-all duration-200 cursor-pointer",
                      active ? "bg-accent shadow-sm shadow-accent/30" : "hover:bg-surface-2",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={cn("flex-1 min-w-0 text-sm font-semibold leading-snug line-clamp-1", active ? "text-black" : "text-ink")}>
                        {note.title}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(note);
                        }}
                        className={cn(
                          "opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-pointer",
                          active ? "text-black/50 hover:text-black" : "text-muted hover:text-danger",
                        )}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {blocksPreviewText(note.content) && (
                      <p className={cn("text-xs line-clamp-1", active ? "text-black/60" : "text-muted")}>
                        {blocksPreviewText(note.content)}
                      </p>
                    )}
                    <span className={cn("text-[10px]", active ? "text-black/50" : "text-muted-2")}>
                      {formatDate(note.updatedAt)}
                    </span>
                  </div>
                </Fragment>
              );
            })
          )}
        </div>
      </div>

      <div className={cn("flex-1 min-w-0 overflow-y-auto", activeId ? "block" : "hidden md:block")}>
        {children}
      </div>

      <OrganizePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onContinue={handlePickerContinue}
        title="essa nota"
        folders={folders}
        clients={clients}
        projects={projects}
        onAddFolder={handleAddFolder}
      />
    </div>
    </NotesRefreshContext.Provider>
  );
}
