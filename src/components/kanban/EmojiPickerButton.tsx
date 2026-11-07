"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";
import { cn } from "@/lib/cn";

const EMOJIS = [
  "😀", "😂", "🥰", "😍", "😎", "🤩", "😉", "😅", "🙌", "👏",
  "🔥", "✨", "🎉", "💥", "⭐", "💡", "📌", "📢", "🚀", "💪",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💯", "✅",
  "👍", "👀", "🙏", "🤝", "😱", "😢", "😮", "🤔", "😴", "🥳",
];

/** Botão de emoji que insere o caractere na posição atual do cursor de um textarea controlado. */
export function EmojiPickerButton({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current?.contains(e.target as Node) || buttonRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      const caret = start + emoji.length;
      el?.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-accent hover:bg-surface-3 transition-colors cursor-pointer",
          open && "text-accent bg-surface-3",
        )}
        title="Inserir emoji"
      >
        <Smile size={16} />
      </button>
      {open && (
        <div
          ref={popoverRef}
          className="absolute z-20 right-0 top-full mt-1.5 w-64 bg-surface border border-border rounded-2xl shadow-lg shadow-black/10 p-2.5"
        >
          <div className="grid grid-cols-8 gap-0.5">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-base hover:bg-surface-2 transition-colors cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
