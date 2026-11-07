"use client";

import { ReactNode, useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

// Tempo de saída (ms) - um pouco acima da duração do keyframe pop-out/fade-out
// (150ms) pra garantir que a animação termine visualmente antes de desmontar.
const EXIT_DURATION = 160;

export function Modal({
  open,
  onClose,
  title,
  titleAccent,
  children,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  titleAccent?: ReactNode;
  children: ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
}) {
  // Mantém o modal montado durante a animação de saída: `open` já virou
  // false, mas só desmonta de fato depois do fade/scale terminar.
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
      return;
    }
    if (!rendered) return;
    setClosing(true);
    const timer = window.setTimeout(() => {
      setRendered(false);
      setClosing(false);
    }, EXIT_DURATION);
    return () => window.clearTimeout(timer);
  }, [open, rendered]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!rendered) return null;

  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 motion-reduce:animation-none",
        closing ? "animate-fade-out" : "animate-fade-in",
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full bg-surface rounded-card p-8 shadow-2xl shadow-black/20 max-h-[90vh] overflow-y-auto motion-reduce:animation-none",
          closing ? "animate-pop-out" : "animate-pop-in",
          widths[width],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            {title} {titleAccent && <span className="text-accent">{titleAccent}</span>}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:text-accent transition-colors flex-shrink-0 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
