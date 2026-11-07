import { forwardRef, type InputHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Checkbox estilizado (não o quadradinho nativo do navegador) - mesmo padrão
 * visual do resto do kit (Button/Badge/Select): cantos arredondados, cor de
 * marca ao marcar, transição suave. O <input> real fica sobreposto e
 * invisível (mantém foco/teclado/onChange/register() do react-hook-form
 * funcionando normalmente) - só o visual é substituído.
 */
export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <span className="relative inline-flex w-[18px] h-[18px] flex-shrink-0">
        <input
          ref={ref}
          type="checkbox"
          className={cn("peer absolute inset-0 z-10 opacity-0 cursor-pointer disabled:cursor-not-allowed", className)}
          {...props}
        />
        <span className="absolute inset-0 rounded-[6px] border-2 border-border-2 bg-surface transition-colors peer-checked:bg-accent peer-checked:border-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/30 peer-disabled:opacity-40 pointer-events-none" />
        <Check
          size={12}
          strokeWidth={3}
          className="absolute inset-0 m-auto text-white opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100 transition-all pointer-events-none"
        />
      </span>
    );
  },
);
Checkbox.displayName = "Checkbox";
