"use client";

import { Plus, X } from "lucide-react";

const DEFAULT_NEW_COLOR = "#6366f1";

export function ColorSwatchInput({
  value,
  onChange,
  max = 8,
}: {
  value: string[];
  onChange: (colors: string[]) => void;
  max?: number;
}) {
  function updateAt(index: number, color: string) {
    const next = [...value];
    next[index] = color;
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    if (value.length >= max) return;
    onChange([...value, DEFAULT_NEW_COLOR]);
  }

  return (
    <div className="flex flex-wrap gap-3">
      {value.map((color, i) => (
        <div key={i} className="relative group">
          <label
            className="block w-11 h-11 rounded-full cursor-pointer ring-1 ring-border shadow-sm"
            style={{ backgroundColor: color }}
            title={color}
          >
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#000000"}
              onChange={(e) => updateAt(i, e.target.value)}
              className="opacity-0 w-full h-full cursor-pointer"
            />
          </label>
          <button
            type="button"
            onClick={() => removeAt(i)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Remover cor"
          >
            <X size={11} />
          </button>
          <span className="block text-center text-[10px] text-muted-2 mt-1 uppercase">{color}</span>
        </div>
      ))}
      {value.length < max && (
        <button
          type="button"
          onClick={add}
          className="w-11 h-11 rounded-full border border-dashed border-border-2 text-muted hover:text-accent hover:border-accent flex items-center justify-center cursor-pointer transition-colors"
          title="Adicionar cor"
        >
          <Plus size={16} />
        </button>
      )}
    </div>
  );
}
