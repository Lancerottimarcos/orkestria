import { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Divisor pontilhado, usado no lugar de bordas sólidas entre seções e linhas. */
export function DottedDivider({ className }: { className?: string }) {
  return <div className={cn("border-t border-dotted border-border-2", className)} />;
}

/**
 * Linha "rótulo ..... valor" com preenchimento pontilhado entre os dois
 * (padrão da ficha de perfil da referência).
 */
export function DottedRow({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-2.5 text-sm", className)}>
      <span className="flex items-center gap-2 text-muted flex-shrink-0">
        {icon}
        {label}
      </span>
      <span className="flex-1 border-b border-dotted border-border-2 -translate-y-1" />
      <span className="text-ink font-medium text-right">{value}</span>
    </div>
  );
}
