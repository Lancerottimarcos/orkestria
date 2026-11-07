import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "accent" | "solid" | "dark" | "panel";
type Size = "sm" | "md" | "lg";

const tones: Record<Tone, string> = {
  default: "bg-surface-2 text-muted",
  accent: "bg-accent/12 text-accent",
  solid: "bg-accent text-black",
  dark: "bg-ink text-bg",
  panel: "bg-panel-2 text-panel-ink",
};

const sizes: Record<Size, string> = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

/** Ícone dentro de um círculo, elemento recorrente do novo padrão visual. */
export function IconChip({
  children,
  tone = "default",
  size = "md",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  size?: Size;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200 ease-out",
        tones[tone],
        sizes[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
