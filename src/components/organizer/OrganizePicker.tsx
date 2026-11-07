"use client";

import { useState } from "react";
import { Folder as FolderIcon, Users, FolderKanban, Ban, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { GroupMode } from "./GroupSidebar";

export type OrganizeTarget = {
  mode: GroupMode | "none";
  id: string | null;
  label: string;
};

type Option = { id: string; name: string };

export function OrganizePicker({
  open,
  onClose,
  onContinue,
  title,
  folders,
  clients,
  projects,
  onAddFolder,
}: {
  open: boolean;
  onClose: () => void;
  onContinue: (target: OrganizeTarget) => void;
  title: string;
  folders: Option[];
  clients: Option[];
  projects: Option[];
  onAddFolder: (name: string) => Promise<Option | null>;
}) {
  const [tab, setTab] = useState<GroupMode | "none">("folder");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const tabs: { key: GroupMode | "none"; label: string; icon: typeof FolderIcon }[] = [
    { key: "folder", label: "Pasta", icon: FolderIcon },
    { key: "client", label: "Cliente", icon: Users },
    { key: "project", label: "Projeto", icon: FolderKanban },
    { key: "none", label: "Nenhuma", icon: Ban },
  ];

  const list = tab === "folder" ? folders : tab === "client" ? clients : tab === "project" ? projects : [];

  function handleTabChange(t: GroupMode | "none") {
    setTab(t);
    setSelectedId(null);
    setAddingFolder(false);
  }

  async function handleAddFolder() {
    if (!newFolderName.trim()) return;
    const folder = await onAddFolder(newFolderName.trim());
    if (folder) setSelectedId(folder.id);
    setNewFolderName("");
    setAddingFolder(false);
  }

  function handleContinue() {
    if (tab === "none") {
      onContinue({ mode: "none", id: null, label: "Sem organização" });
      return;
    }
    const item = list.find((i) => i.id === selectedId);
    if (!item) return;
    onContinue({ mode: tab, id: item.id, label: item.name });
  }

  return (
    <Modal open={open} onClose={onClose} title="Onde" titleAccent={`salvar ${title}?`} width="sm">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-1 bg-surface-2 rounded-3xl p-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 rounded-[18px] text-[11px] font-semibold transition-all duration-200 cursor-pointer",
                tab === t.key ? "bg-accent text-black shadow-sm shadow-accent/30" : "text-muted hover:text-ink",
              )}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {tab !== "none" && (
          <div className="max-h-64 overflow-y-auto flex flex-col gap-1.5 -mx-1 px-1">
            {list.length === 0 && !addingFolder && (
              <p className="text-xs text-muted-2 text-center py-6">
                {tab === "folder" ? "Nenhuma pasta ainda." : `Nenhum ${tab === "client" ? "cliente" : "projeto"} cadastrado.`}
              </p>
            )}
            {list.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "text-left px-4 py-2.5 rounded-full text-sm truncate transition-all duration-200 cursor-pointer",
                  selectedId === item.id
                    ? "bg-accent text-black font-semibold shadow-sm shadow-accent/30"
                    : "bg-surface-2 text-ink font-medium hover:bg-surface-3",
                )}
              >
                {item.name}
              </button>
            ))}
            {tab === "folder" && (
              <div className="pt-1">
                {addingFolder ? (
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onBlur={handleAddFolder}
                    onKeyDown={(e) => e.key === "Enter" && handleAddFolder()}
                    placeholder="Nome da pasta"
                    className="w-full bg-surface-2 border border-border rounded-full px-4 py-2 text-sm text-ink outline-none focus:border-accent"
                  />
                ) : (
                  <button
                    onClick={() => setAddingFolder(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-dashed border-border-2 text-xs font-semibold text-muted hover:text-accent hover:border-accent transition-colors cursor-pointer"
                  >
                    <Plus size={13} /> Nova pasta
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "none" && (
          <p className="text-xs text-muted-2 py-4 text-center">
            A nota não ficará vinculada a nenhuma pasta, cliente ou projeto.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleContinue} disabled={tab !== "none" && !selectedId}>
            Continuar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
