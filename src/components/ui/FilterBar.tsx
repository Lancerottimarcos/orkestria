import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Search, X, type LucideIcon } from "lucide-react";
import { Input, Select } from "./Input";
import { cn } from "@/lib/cn";

/**
 * Linha de filtros em pílulas soltas sobre o fundo (sem cartão em volta),
 * seguindo o padrão da referência.
 */
export function FilterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5 flex-wrap mb-6", className)}>
      {children}
    </div>
  );
}

export function FilterSearch({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("relative flex-1 min-w-40 max-w-xs", className)}>
      <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-2 pointer-events-none" />
      <Input className="pl-10 bg-surface border-border shadow-sm shadow-black/5" {...props} />
    </div>
  );
}

export function FilterSelect({
  icon: Icon,
  className,
  value,
  neutralValue = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  icon?: LucideIcon;
  neutralValue?: string;
}) {
  const active = value !== undefined && value !== neutralValue;
  return (
    <div className="relative flex-shrink-0">
      {Icon && (
        <Icon
          size={14}
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors",
            active ? "text-accent" : "text-muted-2",
          )}
        />
      )}
      <Select
        value={value}
        className={cn(
          "max-w-44 bg-surface border-border shadow-sm shadow-black/5 transition-colors",
          Icon && "pl-9",
          active && "border-accent/50 text-accent",
          className,
        )}
        {...props}
      >
        {children}
      </Select>
    </div>
  );
}

export function FilterTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-1 bg-surface rounded-full p-1 flex-shrink-0 shadow-sm shadow-black/5",
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            "px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer",
            value === tab.key ? "bg-accent text-black" : "text-muted hover:text-ink",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function FilterClearButton({
  onClick,
  label = "Limpar",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-danger transition-colors px-3 py-2 rounded-full hover:bg-surface cursor-pointer flex-shrink-0"
    >
      <X size={13} /> {label}
    </button>
  );
}
