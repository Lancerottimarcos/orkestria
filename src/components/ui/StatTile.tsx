import { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconChip } from "./IconChip";

export function StatTile({
  label,
  value,
  icon,
  trend,
  trendTone = "neutral",
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  trend?: string;
  trendTone?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="bg-surface rounded-card p-6 shadow-sm shadow-black/5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-muted normal-case">
          {label}
        </span>
        <IconChip tone="accent" size="sm">
          {icon}
        </IconChip>
      </div>
      <div className="text-[32px] font-light leading-none tracking-tight text-ink">
        {value}
      </div>
      {trend && (
        <span
          className={cn(
            "text-xs font-medium",
            trendTone === "positive" && "text-success",
            trendTone === "negative" && "text-danger",
            trendTone === "neutral" && "text-muted",
          )}
        >
          {trend}
        </span>
      )}
    </div>
  );
}
