"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export function TagInput({
  value,
  onChange,
  placeholder,
  tone = "accent",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  tone?: "accent" | "danger" | "success" | "neutral";
}) {
  const [draft, setDraft] = useState("");

  const toneClass = {
    accent: "bg-accent/10 text-accent-light",
    danger: "bg-danger/10 text-danger",
    success: "bg-success/10 text-success",
    neutral: "bg-surface-3 text-ink",
  }[tone];

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed]);
    setDraft("");
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 bg-surface-2 rounded-2xl p-2.5 min-h-11">
      {value.map((tag, i) => (
        <span
          key={i}
          className={cn("inline-flex items-center gap-1 text-xs font-semibold pl-2.5 pr-1.5 py-1 rounded-full", toneClass)}
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            className="opacity-60 hover:opacity-100 cursor-pointer"
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <div className="flex items-center gap-1 flex-1 min-w-24">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && !draft && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={commit}
          placeholder={value.length === 0 ? placeholder : "Adicionar..."}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm text-ink placeholder:text-muted-2 py-1"
        />
        {draft.trim() && (
          <button
            type="button"
            onClick={commit}
            className="text-muted hover:text-accent cursor-pointer flex-shrink-0"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
