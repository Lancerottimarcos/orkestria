"use client";

import {
  AlignLeft,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code2,
  Minus,
  Info,
  AlertTriangle,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { IconChip } from "@/components/ui/IconChip";
import { cn } from "@/lib/cn";
import type { BlockType } from "./blocks";

const ITEMS: { type: BlockType; label: string; description: string; icon: LucideIcon }[] = [
  { type: "text", label: "Texto", description: "Comece a escrever com texto simples", icon: AlignLeft },
  { type: "checklist", label: "Checklist", description: "Crie uma lista de tarefas ou checklist", icon: CheckSquare },
  { type: "h1", label: "Cabeçalho 1", description: "Cabeçalho grande de seção", icon: Heading1 },
  { type: "h2", label: "Cabeçalho 2", description: "Cabeçalho médio de seção", icon: Heading2 },
  { type: "h3", label: "Cabeçalho 3", description: "Cabeçalho pequeno de seção", icon: Heading3 },
  { type: "bullet", label: "Lista de marcadores", description: "Crie uma lista de marcadores simples", icon: List },
  { type: "numbered", label: "Lista ordenada", description: "Crie uma lista com numeração", icon: ListOrdered },
  { type: "quote", label: "Citação", description: "Adicione uma caixa com uma citação", icon: Quote },
  { type: "divider", label: "Separador de linha", description: "Adicione um separador de linha", icon: Minus },
  { type: "code", label: "Código", description: "Crie um bloco de código formatado", icon: Code2 },
  { type: "callout-info", label: "Caixa de informações", description: "Adicione uma caixa com informações", icon: Info },
  { type: "callout-warning", label: "Aviso", description: "Adicione uma caixa com aviso", icon: AlertTriangle },
  { type: "callout-tip", label: "Dica", description: "Adicione uma caixa com uma dica", icon: Lightbulb },
];

export function AddBlockMenu({
  open,
  onClose,
  onSelect,
  anchor,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (type: BlockType) => void;
  anchor?: { top: number; left: number } | null;
}) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        style={anchor ? { top: anchor.top, left: anchor.left } : undefined}
        className={cn(
          "z-50 w-72 bg-surface border border-border rounded-3xl shadow-2xl shadow-black/10 p-2 max-h-80 overflow-y-auto",
          anchor ? "fixed" : "absolute top-full left-0 mt-1.5",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {ITEMS.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => onSelect(item.type)}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-full hover:bg-surface-2 transition-colors text-left cursor-pointer"
          >
            <IconChip size="sm">
              <item.icon size={14} />
            </IconChip>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-ink truncate">{item.label}</p>
              <p className="text-[11px] text-muted truncate">{item.description}</p>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
