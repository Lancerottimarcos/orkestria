"use client";

import { useRef } from "react";
import { Camera } from "lucide-react";
import { Avatar } from "./Avatar";

export function AvatarUploadField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
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
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative group cursor-pointer rounded-full"
      >
        <Avatar name={name || "?"} url={value} size={56} className="text-lg" />
        <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Camera size={18} className="text-white" />
        </span>
      </button>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs font-semibold text-accent hover:underline cursor-pointer text-left"
        >
          {value ? "Trocar foto" : "Adicionar foto"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs font-semibold text-muted hover:text-danger cursor-pointer text-left"
          >
            Remover foto
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
