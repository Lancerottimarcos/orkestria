import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "success" | "danger" | "muted";

const toneClasses: Record<Tone, string> = {
  neutral: "text-ink bg-surface-2",
  accent: "text-accent bg-accent/10",
  success: "text-success bg-success/10",
  danger: "text-danger bg-danger/10",
  muted: "text-muted bg-surface-2",
};

const solidToneClasses: Record<Tone, string> = {
  neutral: "text-white bg-ink",
  accent: "text-black bg-accent",
  success: "text-white bg-[#1fd15c]",
  danger: "text-white bg-[#f0403f]",
  muted: "text-white bg-muted-2",
};

const sizeClasses = {
  sm: "text-[13px] px-2 py-[3px] gap-1",
  md: "text-xs px-3 py-1.5 gap-1.5",
};

export function Badge({
  children,
  tone = "neutral",
  icon,
  solid = false,
  size = "md",
  pulse = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  solid?: boolean;
  size?: "sm" | "md";
  pulse?: boolean;
  className?: string;
}) {
  const dotSize = size === "sm" ? "w-1 h-1" : "w-1.5 h-1.5";
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full transition-colors duration-200 ease-out",
        sizeClasses[size],
        solid ? solidToneClasses[tone] : toneClasses[tone],
        className,
      )}
    >
      {icon ??
        (pulse ? (
          <span className={cn("relative flex flex-shrink-0", dotSize)}>
            <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-75 animate-ping" />
            <span className="relative inline-flex h-full w-full rounded-full bg-current" />
          </span>
        ) : (
          <span className={cn("rounded-full bg-current flex-shrink-0", dotSize, !solid && "opacity-70")} />
        ))}
      {children}
    </span>
  );
}
