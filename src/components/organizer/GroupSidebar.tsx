"use client";

import { useState } from "react";
import { Folder as FolderIcon, Users, FolderKanban, Plus, Pencil, Trash2, Layers } from "lucide-react";
import { DottedDivider } from "@/components/ui/Dotted";
import { cn } from "@/lib/cn";

export type GroupMode = "folder" | "client" | "project";

export type GroupOption = {
  id: string | null;
  name: string;
  count: number;
};

export function GroupSidebar({
  mode,
  onModeChange,
  groups,
  selectedGroupId,
  onSelectGroup,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  embedded = false,
}: {
  mode: GroupMode;
  onModeChange: (mode: GroupMode) => void;
  groups: GroupOption[];
  selectedGroupId: string | null;
  onSelectGroup: (id: string | null) => void;
  onAddFolder?: (name: string) => void;
  onRenameFolder?: (id: string, name: string) => void;
  onDeleteFolder?: (id: string) => void;
  embedded?: boolean;
}) {
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function commitAdd() {
    if (newFolderName.trim() && onAddFolder) onAddFolder(newFolderName.trim());
    setNewFolderName("");
    setAddingFolder(false);
  }

  function commitRename(id: string) {
    if (editingName.trim() && onRenameFolder) onRenameFolder(id, editingName.trim());
    setEditingId(null);
  }

  const modes: { key: GroupMode; label: string; icon: typeof FolderIcon }[] = [
    { key: "folder", label: "Pasta", icon: FolderIcon },
    { key: "client", label: "Cliente", icon: Users },
    { key: "project", label: "Projeto", icon: FolderKanban },
  ];

  return (
    <div
      className={
        embedded
          ? "flex flex-col gap-3"
          : "w-60 flex-shrink-0 bg-surface rounded-card shadow-sm shadow-black/5 p-4 flex flex-col gap-4 h-fit"
      }
    >
      <div>
        <p className="text-[13px] font-medium text-muted mb-2 px-1.5">Agrupar por</p>
        <div className="flex gap-1 bg-surface-2 rounded-full p-1">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => onModeChange(m.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[11px] font-semibold transition-all duration-200 cursor-pointer",
                mode === m.key ? "bg-accent text-black shadow-sm shadow-accent/30" : "text-muted hover:text-ink",
              )}
            >
              <m.icon size={13} />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <DottedDivider />

      <div className="flex flex-col gap-1">
        <button
          onClick={() => onSelectGroup(null)}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer",
            selectedGroupId === null ? "bg-accent text-black shadow-sm shadow-accent/30" : "text-ink hover:bg-surface-2",
          )}
        >
          <Layers size={14} />
          <span className="flex-1 text-left truncate">Todas</span>
        </button>

        {groups.map((g) => {
          const active = selectedGroupId === g.id;
          return (
            <div
              key={g.id ?? "none"}
              className={cn(
                "group flex items-center gap-2 pl-3.5 pr-2 py-2 rounded-full text-sm transition-all duration-200",
                active ? "bg-accent text-black shadow-sm shadow-accent/30" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              {editingId === g.id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => commitRename(g.id!)}
                  onKeyDown={(e) => e.key === "Enter" && commitRename(g.id!)}
                  className="flex-1 bg-transparent border-none outline-none text-sm min-w-0"
                />
              ) : (
                <button
                  onClick={() => onSelectGroup(g.id)}
                  className="flex-1 flex items-center gap-2 min-w-0 text-left cursor-pointer"
                >
                  <span className={cn("truncate", active && "font-semibold")}>{g.name}</span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-5 text-center flex-shrink-0",
                      active ? "bg-black/15 text-black" : "bg-surface-3 text-muted",
                    )}
                  >
                    {g.count}
                  </span>
                </button>
              )}
              {mode === "folder" && g.id && onRenameFolder && (
                <div className="flex items-center gap-0.5 flex-shrink-0 opacity-100 sm:opacity-0 sm:pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto sm:group-focus-within:opacity-100 sm:group-focus-within:pointer-events-auto transition-opacity">
                  <button
                    onClick={() => {
                      setEditingId(g.id);
                      setEditingName(g.name);
                    }}
                    className={cn(
                      "p-1 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                      active ? "text-black/50 hover:text-black" : "text-muted hover:text-accent",
                    )}
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => onDeleteFolder?.(g.id!)}
                    className={cn(
                      "p-1 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30",
                      active ? "text-black/50 hover:text-black" : "text-muted hover:text-danger",
                    )}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {mode === "folder" && onAddFolder && (
        <div>
          {addingFolder ? (
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onBlur={commitAdd}
              onKeyDown={(e) => e.key === "Enter" && commitAdd()}
              placeholder="Nome da pasta"
              className="w-full bg-surface-2 border border-border rounded-full px-4 py-2 text-sm text-ink outline-none focus:border-accent"
            />
          ) : (
            <button
              onClick={() => setAddingFolder(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-full border border-dashed border-border-2 text-xs font-semibold text-muted hover:text-accent hover:border-accent transition-colors cursor-pointer"
            >
              <Plus size={13} /> Nova pasta
            </button>
          )}
        </div>
      )}
    </div>
  );
}
