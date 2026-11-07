"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";

export type BoardImage = { id: string; url: string; category?: string };

export function ImageBoard({
  label,
  images,
  onAdd,
  onDelete,
  emptyHint = "Nenhuma imagem ainda.",
}: {
  label: string;
  images: BoardImage[];
  onAdd: (dataUrls: string[]) => Promise<void> | void;
  onDelete: (imageId: string) => void;
  emptyHint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    const dataUrls = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          }),
      ),
    );
    await onAdd(dataUrls);
    setUploading(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 hover:bg-accent/20 rounded-full px-3.5 py-2 transition-colors cursor-pointer disabled:opacity-50"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
          Adicionar imagens
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      </div>
      {images.length === 0 ? (
        <div className="rounded-3xl bg-hatch border border-dotted border-border-2 px-6 py-10 text-center text-sm text-muted-2">
          {emptyHint}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-2xl overflow-hidden aspect-square bg-surface-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onDelete(img.id)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
