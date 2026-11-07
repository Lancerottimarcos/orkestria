"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

// Mesma duração de saída usada no Modal (globals.css: fade-out/pop-out).
const EXIT_DURATION = 160;

export function Lightbox({
  url,
  type,
  alt,
  onClose,
}: {
  url: string;
  type: "IMAGE" | "VIDEO";
  alt?: string | null;
  onClose: () => void;
}) {
  // O componente é montado/desmontado pelo pai (ex: {open && <Lightbox/>}),
  // então a saída suave precisa atrasar o onClose real até a animação
  // terminar, em vez de desmontar na hora.
  const [closing, setClosing] = useState(false);

  const requestClose = useCallback(() => {
    setClosing(true);
    window.setTimeout(onClose, EXIT_DURATION);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [requestClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-6 motion-reduce:animation-none",
        closing ? "animate-fade-out" : "animate-fade-in",
      )}
      onClick={requestClose}
    >
      <button
        type="button"
        onClick={requestClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
      >
        <X size={18} />
      </button>
      {type === "VIDEO" ? (
        <video
          src={url}
          controls
          autoPlay
          className={cn(
            "max-w-full max-h-full rounded-2xl motion-reduce:animation-none",
            closing ? "animate-pop-out" : "animate-pop-in",
          )}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt ?? ""}
          className={cn(
            "max-w-full max-h-full rounded-2xl object-contain motion-reduce:animation-none",
            closing ? "animate-pop-out" : "animate-pop-in",
          )}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
