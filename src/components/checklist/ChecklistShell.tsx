"use client";

import { createContext, Fragment, ReactNode, useContext, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Plus, Trash2, Search, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconChip } from "@/components/ui/IconChip";
import { DottedDivider } from "@/components/ui/Dotted";
import { EmptyState } from "@/components/ui/PageHeader";
import { GroupSidebar, type GroupMode } from "@/components/organizer/GroupSidebar";
import { OrganizePicker, type OrganizeTarget } from "@/components/organizer/OrganizePicker";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type Option = { id: string; name: string };
type ItemRow = { id: string; text: string; done: boolean };

type ChecklistRow = {
  id: string;
  title: string;
  updatedAt: string;
  folder: Option | null;
  client: Option | null;
  project: Option | null;
  items: ItemRow[];
};

const NONE = "__none__";

const ChecklistRefreshContext = createContext<() => Promise<unknown>>(async () => {});
export function useChecklistRefresh() {
  return useContext(ChecklistRefreshContext);
}

export function ChecklistShell({
  initialChecklists,
  initialFolders,
  clients,
  projects,
  children,
}: {
  initialChecklists: ChecklistRow[];
  initialFolders: Option[];
  clients: Option[];
  projects: Option[];
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const activeId = pathname?.split("/checklist/")[1] ?? null;

  const [checklists, setChecklists] = useState(initialChecklists);
  const { confirmDialog } = useConfirmDialog();
  const [folders, setFolders] = useState(initialFolders);
  const [mode, setMode] = useState<GroupMode>("folder");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    const updated = await fetch("/api/checklists").then((r) => r.json());
    setChecklists(updated);
    router.refresh();
    return updated as ChecklistRow[];
  }

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
    if (!(await confirmDialog("Remover esta pasta? As checklists nela ficarão sem pasta.", { confirmLabel: "Remover" }))) return;
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
        title: "Nova checklist",
        folderId: target.mode === "folder" ? target.id ?? "" : "",
        clientId: target.mode === "client" ? target.id ?? "" : "",
        projectId: target.mode === "project" ? target.id ?? "" : "",
      };
      const res = await fetch("/api/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const checklist = await res.json();
        setChecklists((prev) => [checklist, ...prev]);
        router.push(`/checklist/${checklist.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(checklist: ChecklistRow) {
    if (!(await confirmDialog(`Remover a checklist "${checklist.title}"?`, { confirmLabel: "Remover" }))) return;
    const res = await fetch(`/api/checklists/${checklist.id}`, { method: "DELETE" });
    if (res.ok) {
      if (activeId === checklist.id) router.push("/checklist");
      await refresh();
    }
  }

  const groups = useMemo(() => {
    const source = mode === "folder" ? folders : mode === "client" ? clients : projects;
    const base = source.map((s) => ({
      id: s.id,
      name: s.name,
      count: checklists.filter((c) => {
        const ref = mode === "folder" ? c.folder : mode === "client" ? c.client : c.project;
        return ref?.id === s.id;
      }).length,
    }));
    const noneCount = checklists.filter((c) => {
      const ref = mode === "folder" ? c.folder : mode === "client" ? c.client : c.project;
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
  }, [mode, folders, clients, projects, checklists]);

  const filtered = useMemo(() => {
    return checklists
      .filter((c) => {
        if (selectedGroupId === null) return true;
        const ref = mode === "folder" ? c.folder : mode === "client" ? c.client : c.project;
        if (selectedGroupId === NONE) return !ref;
        return ref?.id === selectedGroupId;
      })
      .filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));
  }, [checklists, mode, selectedGroupId, search]);

  return (
    <ChecklistRefreshContext.Provider value={refresh}>
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
              <ListChecks size={15} strokeWidth={2} />
            </IconChip>
            <h2 className="text-base font-semibold text-ink">Checklist</h2>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={creating}
            title="Nova checklist"
            className="w-10 h-10 rounded-full bg-accent text-black hover:bg-accent-light transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            <Plus size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="px-4 pb-4 flex flex-col gap-4">
          <div className="relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-2" />
            <Input
              placeholder="Buscar checklist..."
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
              icon={<ListChecks size={20} strokeWidth={1.8} />}
              title={checklists.length === 0 ? "Nenhuma checklist ainda" : "Nenhuma checklist encontrada"}
              description={
                checklists.length === 0
                  ? "Crie sua primeira checklist para acompanhar tarefas e rotinas."
                  : "Ajuste a busca ou o filtro para encontrar o que procura."
              }
              action={
                checklists.length === 0 ? (
                  <Button type="button" size="sm" onClick={() => setPickerOpen(true)} disabled={creating}>
                    <Plus size={13} /> Nova checklist
                  </Button>
                ) : undefined
              }
            />
          ) : (
            filtered.map((checklist, index) => {
              const total = checklist.items.length;
              const done = checklist.items.filter((i) => i.done).length;
              const pct = total > 0 ? (done / total) * 100 : 0;
              const active = activeId === checklist.id;
              return (
                <Fragment key={checklist.id}>
                  {index > 0 && <DottedDivider className="mx-4 my-1" />}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/checklist/${checklist.id}`)}
                    onKeyDown={(e) => e.key === "Enter" && router.push(`/checklist/${checklist.id}`)}
                    className={cn(
                      "group text-left px-4 py-3.5 rounded-3xl flex flex-col gap-1.5 transition-all duration-200 cursor-pointer",
                      active ? "bg-accent shadow-sm shadow-accent/30" : "hover:bg-surface-2",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={cn("flex-1 min-w-0 text-sm font-semibold leading-snug line-clamp-1", active ? "text-black" : "text-ink")}>
                        {checklist.title}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(checklist);
                        }}
                        className={cn(
                          "opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-pointer",
                          active ? "text-black/50 hover:text-black" : "text-muted hover:text-danger",
                        )}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn("flex-1 h-1.5 rounded-full overflow-hidden", active ? "bg-black/15" : "bg-surface-2")}>
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width] duration-300",
                            pct === 100 ? "bg-success" : active ? "bg-black" : "bg-accent",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={cn("text-[10px] font-semibold flex-shrink-0", active ? "text-black/60" : "text-muted-2")}>
                        {total > 0 ? `${done}/${total}` : "-"}
                      </span>
                    </div>
                    <span className={cn("text-[10px]", active ? "text-black/50" : "text-muted-2")}>
                      {formatDate(checklist.updatedAt)}
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
        title="essa checklist"
        folders={folders}
        clients={clients}
        projects={projects}
        onAddFolder={handleAddFolder}
      />
    </div>
    </ChecklistRefreshContext.Provider>
  );
}
