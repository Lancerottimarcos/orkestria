import { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Padding = "none" | "sm" | "md" | "lg";

const paddings: Record<Padding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  className,
  padding = "md",
  style,
}: {
  children: ReactNode;
  className?: string;
  padding?: Padding;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "bg-surface rounded-card shadow-sm shadow-black/5 transition-[box-shadow,transform] duration-200 ease-out",
        paddings[padding],
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Painel de contraste escuro (o "dark card" da referência), quase preto nos
 * dois temas. Textos internos usam text-panel-ink / text-panel-muted e
 * superfícies internas bg-panel-2.
 */
export function Panel({
  children,
  className,
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  padding?: Padding;
}) {
  return (
    <div
      className={cn(
        "bg-panel text-panel-ink rounded-card shadow-sm shadow-black/15 transition-[box-shadow,transform] duration-200 ease-out",
        paddings[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
