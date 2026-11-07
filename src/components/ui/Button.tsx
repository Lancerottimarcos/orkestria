import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "dark" | "ghost" | "danger" | "subtle" | "success";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-black hover:bg-accent-light disabled:hover:bg-accent",
  dark: "bg-ink text-bg hover:opacity-85",
  ghost:
    "bg-transparent text-ink border border-border-2 hover:border-accent hover:text-accent",
  danger:
    "bg-transparent text-danger border border-danger/40 hover:bg-danger/10",
  subtle:
    "bg-surface-2 text-ink hover:bg-surface-3",
  success:
    "bg-success text-white hover:opacity-90 disabled:hover:opacity-100",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3.5 py-2 text-xs gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-6 py-3 text-sm gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold transition-all duration-150 ease-out active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
