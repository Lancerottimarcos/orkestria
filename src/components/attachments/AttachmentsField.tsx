"use client";

import { useRef, useState } from "react";
import { ImagePlus, Video, FileText, X as XIcon, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Lightbox } from "@/components/ui/Lightbox";

export type AttachmentDraft = {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "FILE";
  name?: string | null;
};

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const UPLOAD_TIMEOUT_MS = 30_000;

/**
 * Sobe o arquivo para /api/uploads (fica em URL pública, necessária pra
 * publicar no Instagram) e cai para data URI local se o upload falhar OU
 * travar (fetch não tem timeout nativo - sem isso, uma conexão que trava
 * deixa o anexo girando pra sempre, sem nunca desistir).
 */
async function uploadFile(file: File): Promise<{ url: string; type: "IMAGE" | "VIDEO" | "FILE" }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: form, signal: controller.signal });
      if (!res.ok) throw new Error("upload falhou");
      const data = await res.json();
      return { url: data.url, type: data.type };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Fallback em data URI só faz sentido pra imagem/vídeo (preview inline);
    // arquivo genérico sem upload bem-sucedido não tem pra onde ir.
    const isVideo = file.type.startsWith("video/");
    const url = await readFileAsDataUrl(file);
    return { url, type: isVideo ? "VIDEO" : "IMAGE" };
  }
}

export function AttachmentsField({
  attachments,
  onChange,
  allowFiles = true,
}: {
  attachments: AttachmentDraft[];
  onChange: (next: AttachmentDraft[]) => void;
  /** false nos fluxos que publicam direto em rede social (post de aprovação,
   * agendamento) - lá só imagem/vídeo fazem sentido, nunca um PDF genérico. */
  allowFiles?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [preview, setPreview] = useState<(AttachmentDraft & { type: "IMAGE" | "VIDEO" }) | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    // `files` é a FileList "viva" do input: fica vazia assim que resetamos
    // fileRef.current.value abaixo, então converte pra array e guarda a
    // quantidade antes disso - senão o decremento no finally soma 0 em vez
    // do que foi incrementado. accept do input já filtra na maioria dos
    // navegadores, mas soltar arquivo via drag-and-drop pode ignorar isso -
    // reforça aqui quando allowFiles é false.
    const fileList = allowFiles
      ? Array.from(files)
      : Array.from(files).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (fileList.length === 0) return;
    const count = fileList.length;
    setUploadingCount((n) => n + count);
    try {
      const uploaded = await Promise.all(
        fileList.map(async (file) => {
          const { url, type } = await uploadFile(file);
          return { id: genId(), url, type, name: file.name } satisfies AttachmentDraft;
        }),
      );
      onChange([...attachments, ...uploaded]);
    } finally {
      setUploadingCount((n) => Math.max(0, n - count));
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeAt(id: string) {
    onChange(attachments.filter((a) => a.id !== id));
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      {attachments.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => {
            if (a.type === "FILE") window.open(a.url, "_blank");
            else setPreview(a as AttachmentDraft & { type: "IMAGE" | "VIDEO" });
          }}
          className={cn(
            "relative w-20 h-20 rounded-2xl bg-surface-2 overflow-hidden group flex-shrink-0",
            a.type === "FILE" ? "cursor-pointer" : "cursor-zoom-in",
          )}
        >
          {a.type === "VIDEO" ? (
            <div className="w-full h-full flex items-center justify-center">
              <video src={a.url} className="w-full h-full object-cover" muted />
              <Video size={16} className="absolute inset-0 m-auto text-white drop-shadow" />
            </div>
          ) : a.type === "FILE" ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-1.5 text-muted">
              <FileText size={22} strokeWidth={1.6} />
              <span className="text-[9px] font-medium text-center leading-tight line-clamp-2 break-all">
                {a.name ?? "Arquivo"}
              </span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.url} alt={a.name ?? ""} className="w-full h-full object-cover" />
          )}
          <span
            onClick={(e) => {
              e.stopPropagation();
              removeAt(a.id);
            }}
            className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <XIcon size={12} />
          </span>
        </button>
      ))}

      {Array.from({ length: uploadingCount }).map((_, i) => (
        <div
          key={`uploading-${i}`}
          className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center text-muted-2 flex-shrink-0"
        >
          <Loader2 size={18} className="animate-spin" />
        </div>
      ))}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className={cn(
          "w-20 h-20 rounded-2xl border border-dashed border-border-2 bg-hatch flex flex-col items-center justify-center gap-1 text-muted hover:border-accent hover:text-accent transition-colors cursor-pointer flex-shrink-0",
        )}
      >
        <Plus size={16} />
        <span className="text-[10px] font-semibold flex items-center gap-0.5">
          <ImagePlus size={10} /> {allowFiles ? "arquivo" : "mídia"}
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept={allowFiles ? "image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx" : "image/*,video/*"}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {preview && (
        <Lightbox
          url={preview.url}
          type={preview.type}
          alt={preview.name}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
