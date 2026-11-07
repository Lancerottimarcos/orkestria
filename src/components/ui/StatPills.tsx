import { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StatPillTone = "accent" | "dark" | "hatch" | "outline";

const pillTones: Record<StatPillTone, string> = {
  accent: "bg-accent text-black",
  dark: "bg-ink text-bg",
  hatch: "bg-hatch border border-border-2 text-ink",
  outline: "border border-border-2 text-ink",
};

export type StatPillItem = {
  label: string;
  display: ReactNode;
  tone: StatPillTone;
  /** Peso relativo da largura da pílula na linha (ex: o valor numérico). */
  weight?: number;
};

/**
 * Linha de stats em pílulas segmentadas (padrão da referência): rótulo em cima,
 * pílula abaixo com o valor dentro. Tons se alternam entre sólido accent,
 * sólido invertido (preto no claro, branco no escuro), hachurado e contorno.
 */
export function StatPillRow({
  items,
  className,
}: {
  items: StatPillItem[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1.5 min-w-28"
          style={{ flexGrow: Math.max(item.weight ?? 1, 1), flexBasis: 0 }}
        >
          <span className="text-xs font-medium text-muted pl-1">{item.label}</span>
          <span
            className={cn(
              "h-11 rounded-full flex items-center px-5 text-sm font-semibold whitespace-nowrap",
              pillTones[item.tone],
            )}
          >
            {item.display}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Número grande e leve com rótulo pequeno abaixo (padrão "78 Employee"). */
export function BigStat({
  value,
  label,
  icon,
  className,
}: {
  value: ReactNode;
  label: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[40px] font-light leading-none tracking-tight text-ink">
        {value}
      </span>
      <span className="flex items-center gap-1.5 text-sm text-muted">
        {icon}
        {label}
      </span>
    </div>
  );
}
