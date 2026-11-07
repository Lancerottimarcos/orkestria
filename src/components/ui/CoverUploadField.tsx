"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/** Capa retangular com upload real (via /api/uploads) - value/onChange guardam uma URL pública, não um data URL. */
export function CoverUploadField({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "relative group w-full h-28 rounded-2xl overflow-hidden cursor-pointer flex items-center justify-center disabled:cursor-wait",
          value ? "" : "bg-gradient-to-br from-accent/25 via-accent-light/15 to-accent/5",
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Capa" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-accent">
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
            <span className="text-xs font-semibold">{uploading ? "Enviando..." : "Adicionar capa"}</span>
          </span>
        )}
        {!uploading && (
          <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity text-white text-xs font-semibold">
            <Camera size={15} />
            {value ? "Trocar capa" : "Adicionar capa"}
          </span>
        )}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
          title="Remover capa"
        >
          <X size={13} />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
    </div>
  );
}
