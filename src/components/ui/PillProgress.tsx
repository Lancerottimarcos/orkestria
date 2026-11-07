import { cn } from "@/lib/cn";

type Tone = "accent" | "dark" | "hatch" | "muted";

const fillTones: Record<Tone, string> = {
  accent: "bg-accent text-black",
  dark: "bg-ink text-bg",
  hatch: "bg-hatch border border-border-2 text-ink",
  muted: "bg-surface-3 text-ink",
};

/**
 * Barra de progresso em cápsula com o valor escrito dentro do preenchimento
 * (padrão "167 hrs" da referência).
 */
export function PillProgress({
  value,
  label,
  tone = "accent",
  size = "md",
  className,
}: {
  /** 0 a 100 */
  value: number;
  label?: string;
  tone?: Tone;
  size?: "sm" | "md";
  className?: string;
}) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div
      className={cn(
        "w-full rounded-full bg-surface-2 overflow-hidden",
        size === "md" ? "h-10" : "h-7",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full flex items-center px-4 text-xs font-semibold whitespace-nowrap transition-[width] duration-500 ease-out",
          label && "min-w-fit",
          fillTones[tone],
        )}
        style={{ width: `${Math.max(pct, label ? 18 : 4)}%` }}
      >
        {label}
      </div>
    </div>
  );
}

/** Barra fina para dentro de cards e listas. */
export function ThinProgress({
  value,
  tone = "accent",
  className,
}: {
  value: number;
  tone?: Tone;
  className?: string;
}) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div className={cn("w-full h-1.5 rounded-full bg-surface-2 overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", fillTones[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
