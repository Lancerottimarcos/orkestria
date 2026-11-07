"use client";

import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function LogoUploadField({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className={cn("relative w-28 h-28 flex-shrink-0", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "group relative w-full h-full rounded-2xl overflow-hidden cursor-pointer flex items-center justify-center border border-dashed",
          value ? "border-transparent bg-[repeating-conic-gradient(var(--color-surface-3)_0%_25%,transparent_0%_50%)] bg-[length:12px_12px]" : "border-border-2 bg-surface-2",
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Logo" className="w-full h-full object-contain p-3" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-muted">
            <ImagePlus size={18} />
            <span className="text-[11px] font-semibold">Logo</span>
          </span>
        )}
        <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-semibold transition-opacity">
          {value ? "Trocar" : "Adicionar"}
        </span>
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors cursor-pointer"
          title="Remover logo"
        >
          <X size={11} />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
