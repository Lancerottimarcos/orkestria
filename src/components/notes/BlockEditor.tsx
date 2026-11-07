"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import {
  Plus,
  GripVertical,
  Trash2,
  Check,
  Info,
  AlertTriangle,
  Lightbulb,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  List,
  ListOrdered,
  Quote,
  Code2,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { AddBlockMenu } from "./AddBlockMenu";
import { newBlock, type Block, type BlockType } from "./blocks";
import { DottedDivider } from "@/components/ui/Dotted";
import { cn } from "@/lib/cn";

const TOOLBAR_ITEMS: { type: BlockType; label: string; icon: LucideIcon }[] = [
  { type: "h1", label: "Cabeçalho 1", icon: Heading1 },
  { type: "h2", label: "Cabeçalho 2", icon: Heading2 },
  { type: "h3", label: "Cabeçalho 3", icon: Heading3 },
  { type: "checklist", label: "Checklist", icon: CheckSquare },
  { type: "bullet", label: "Lista de marcadores", icon: List },
  { type: "numbered", label: "Lista ordenada", icon: ListOrdered },
  { type: "quote", label: "Citação", icon: Quote },
  { type: "code", label: "Código", icon: Code2 },
  { type: "divider", label: "Separador de linha", icon: Minus },
];

function AutoTextarea({
  value,
  onChange,
  onKeyDown,
  onFocus,
  placeholder,
  className,
  autoFocus,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  inputRef?: (el: HTMLTextAreaElement | null) => void;
}) {
  function handleInput(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  return (
    <textarea
      ref={(el) => {
        inputRef?.(el);
        if (el) handleInput(el);
      }}
      rows={1}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        handleInput(e.target);
      }}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={cn(
        "w-full resize-none overflow-hidden bg-transparent outline-none border-none text-ink placeholder:text-muted-2",
        className,
      )}
    />
  );
}

const CALLOUT_META: Record<string, { icon: LucideIcon; box: string; icon2: string }> = {
  "callout-info": { icon: Info, box: "bg-accent/10", icon2: "text-accent" },
  "callout-warning": { icon: AlertTriangle, box: "bg-danger/10", icon2: "text-danger" },
  "callout-tip": { icon: Lightbulb, box: "bg-success/10", icon2: "text-success" },
};

function computeNumberedIndex(blocks: Block[], index: number) {
  let count = 1;
  for (let i = index - 1; i >= 0; i--) {
    if (blocks[i].type === "numbered") count++;
    else break;
  }
  return count;
}

export function BlockEditor({ blocks, onChange }: { blocks: Block[]; onChange: (blocks: Block[]) => void }) {
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [lastFocusedIndex, setLastFocusedIndex] = useState<number | null>(null);
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  function focusBlock(id: string) {
    requestAnimationFrame(() => {
      const el = refs.current[id];
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function removeBlock(id: string) {
    const index = blocks.findIndex((b) => b.id === id);
    if (blocks.length === 1) {
      onChange([newBlock("text")]);
      return;
    }
    const next = blocks.filter((b) => b.id !== id);
    onChange(next);
    const focusTarget = next[Math.max(0, index - 1)];
    if (focusTarget) focusBlock(focusTarget.id);
  }

  function insertBlock(afterIndex: number, type: BlockType) {
    const block = newBlock(type);
    const next = [...blocks];
    next.splice(afterIndex + 1, 0, block);
    onChange(next);
    setMenuIndex(null);
    focusBlock(block.id);
  }

  function moveBlock(from: number, to: number) {
    if (to < 0 || to >= blocks.length || from === to) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function insertFromToolbar(type: BlockType) {
    const afterIndex = lastFocusedIndex !== null ? lastFocusedIndex : blocks.length - 1;
    insertBlock(afterIndex, type);
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-0.5 mb-6 w-fit bg-surface-2 rounded-full px-2 py-1.5">
        {TOOLBAR_ITEMS.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => insertFromToolbar(item.type)}
            title={item.label}
            className="text-muted hover:text-accent hover:bg-surface rounded-full p-2 transition-colors cursor-pointer"
          >
            <item.icon size={15} />
          </button>
        ))}
      </div>

      {blocks.map((block, index) => {
        const continuedTypes: BlockType[] = ["checklist", "bullet", "numbered"];

        function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
          if (e.key === "Enter" && !e.shiftKey && block.type !== "code") {
            e.preventDefault();
            insertBlock(index, continuedTypes.includes(block.type) ? block.type : "text");
          } else if (e.key === "Backspace" && block.text === "") {
            e.preventDefault();
            removeBlock(block.id);
          }
        }

        function handleTextChange(value: string) {
          if (block.type === "text" && value === "/") {
            setMenuIndex(index);
            return;
          }
          updateBlock(block.id, { text: value });
        }

        return (
          <div
            key={block.id}
            className={cn(
              "group flex items-start gap-0.5 rounded-2xl -mx-2 px-2 transition-colors",
              dragIndex === index ? "opacity-40" : "hover:bg-surface-2/60",
            )}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) moveBlock(dragIndex, index);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
          >
            <div className="relative flex items-center gap-0.5 pt-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  if (menuIndex === index) {
                    setMenuIndex(null);
                    setMenuAnchor(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setMenuAnchor({ top: rect.bottom + 6, left: rect.left });
                    setMenuIndex(index);
                  }
                }}
                title="Adicionar bloco"
                className="text-muted-2 hover:text-accent hover:bg-surface-3 rounded-full p-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                title="Arrastar para reordenar"
                className="text-muted-2 hover:text-ink hover:bg-surface-3 rounded-full p-1 transition-colors cursor-grab active:cursor-grabbing"
              >
                <GripVertical size={14} />
              </button>
              <AddBlockMenu
                open={menuIndex === index}
                onClose={() => {
                  setMenuIndex(null);
                  setMenuAnchor(null);
                }}
                onSelect={(type) => insertBlock(index, type)}
                anchor={menuAnchor}
              />
            </div>

            <div className="flex-1 min-w-0">
              {block.type === "divider" ? (
                <DottedDivider className="my-3" />
              ) : block.type === "checklist" ? (
                <div className="flex items-center gap-2.5 py-1">
                  <button
                    type="button"
                    onClick={() => updateBlock(block.id, { checked: !block.checked })}
                    className={cn(
                      "w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all duration-200",
                      block.checked ? "bg-success border-success" : "border-border-2 hover:border-accent",
                    )}
                  >
                    <Check
                      size={11}
                      strokeWidth={3}
                      className={cn(
                        "text-black transition-all duration-200",
                        block.checked ? "opacity-100 scale-100" : "opacity-0 scale-50",
                      )}
                    />
                  </button>
                  <AutoTextarea
                    value={block.text}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setLastFocusedIndex(index)}
                    placeholder="Item da lista..."
                    inputRef={(el) => (refs.current[block.id] = el)}
                    className={cn("text-sm", block.checked && "line-through text-muted-2")}
                  />
                </div>
              ) : block.type === "bullet" ? (
                <div className="flex items-start gap-2 py-1">
                  <span className="text-muted mt-1.5 flex-shrink-0 select-none">•</span>
                  <AutoTextarea
                    value={block.text}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setLastFocusedIndex(index)}
                    placeholder="Lista..."
                    inputRef={(el) => (refs.current[block.id] = el)}
                    className="text-sm"
                  />
                </div>
              ) : block.type === "numbered" ? (
                <div className="flex items-start gap-2 py-1">
                  <span className="text-muted mt-1 flex-shrink-0 text-sm font-semibold w-4 select-none">
                    {computeNumberedIndex(blocks, index)}.
                  </span>
                  <AutoTextarea
                    value={block.text}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setLastFocusedIndex(index)}
                    placeholder="Lista..."
                    inputRef={(el) => (refs.current[block.id] = el)}
                    className="text-sm"
                  />
                </div>
              ) : block.type === "quote" ? (
                <div className="border-l-[3px] border-accent pl-4 py-1">
                  <AutoTextarea
                    value={block.text}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setLastFocusedIndex(index)}
                    placeholder="Citação..."
                    inputRef={(el) => (refs.current[block.id] = el)}
                    className="text-sm italic text-muted"
                  />
                </div>
              ) : block.type === "code" ? (
                <AutoTextarea
                  value={block.text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setLastFocusedIndex(index)}
                  placeholder="Código..."
                  inputRef={(el) => (refs.current[block.id] = el)}
                  className="text-xs font-mono bg-surface-2 rounded-2xl px-4 py-3 my-1"
                />
              ) : block.type.startsWith("callout") ? (
                (() => {
                  const meta = CALLOUT_META[block.type];
                  return (
                    <div className={cn("flex items-start gap-3 rounded-2xl px-4 py-3 my-1", meta.box)}>
                      <meta.icon size={16} className={cn("flex-shrink-0 mt-0.5", meta.icon2)} />
                      <AutoTextarea
                        value={block.text}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setLastFocusedIndex(index)}
                        placeholder="Escreva aqui..."
                        inputRef={(el) => (refs.current[block.id] = el)}
                        className="text-sm"
                      />
                    </div>
                  );
                })()
              ) : (
                <AutoTextarea
                  value={block.text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setLastFocusedIndex(index)}
                  placeholder={
                    block.type === "h1"
                      ? "Cabeçalho 1"
                      : block.type === "h2"
                        ? "Cabeçalho 2"
                        : block.type === "h3"
                          ? "Cabeçalho 3"
                          : "Escreva aqui, ou digite '/' para comandos..."
                  }
                  inputRef={(el) => (refs.current[block.id] = el)}
                  className={cn(
                    "py-1",
                    block.type === "h1" && "text-2xl font-semibold tracking-tight",
                    block.type === "h2" && "text-xl font-semibold tracking-tight",
                    block.type === "h3" && "text-lg font-semibold",
                    block.type === "text" && "text-sm",
                  )}
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => removeBlock(block.id)}
              title="Remover bloco"
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 text-muted-2 hover:text-danger transition-opacity p-1 rounded-full flex-shrink-0 mt-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
