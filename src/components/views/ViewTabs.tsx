"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function ViewTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { key: T; label: string; icon?: LucideIcon }[];
}) {
  return (
    <div className="inline-flex items-center gap-1 bg-surface rounded-full p-1 shadow-sm shadow-black/5">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer",
            value === opt.key ? "bg-accent text-black" : "text-muted hover:text-ink",
          )}
        >
          {opt.icon && <opt.icon size={14} strokeWidth={2} />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
