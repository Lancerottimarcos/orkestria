"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

const RULES = [
  { key: "length", label: "Mínimo de 8 caracteres", test: (v: string) => v.length >= 8 },
  { key: "number", label: "Deve conter pelo menos 1 número", test: (v: string) => /\d/.test(v) },
  { key: "upper", label: "Deve conter pelo menos 1 letra maiúscula", test: (v: string) => /[A-Z]/.test(v) },
  { key: "lower", label: "Deve conter pelo menos 1 letra minúscula", test: (v: string) => /[a-z]/.test(v) },
  { key: "special", label: "Deve conter pelo menos 1 caractere especial", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

/** As mesmas 5 regras exigidas no servidor (src/lib/schemas.ts) - só passa daqui quando passa lá também. */
export function passwordRules(value: string) {
  return RULES.map((r) => ({ key: r.key, label: r.label, met: r.test(value) }));
}

export function isPasswordStrong(value: string) {
  return RULES.every((r) => r.test(value));
}

const LEVELS = [
  { min: 0, label: "Muito fraca", color: "bg-danger" },
  { min: 2, label: "Fraca", color: "bg-danger" },
  { min: 3, label: "Média", color: "bg-accent" },
  { min: 4, label: "Boa", color: "bg-accent" },
  { min: 5, label: "Ótima", color: "bg-success" },
];

/**
 * Indicador visual de força de senha: barra segmentada + checklist com as
 * mesmas 5 regras validadas no backend (schemas.ts). Mostra em tempo real
 * pra pessoa acertar a senha antes de tentar salvar.
 */
export function PasswordStrength({ value }: { value: string }) {
  const rules = passwordRules(value);
  const met = rules.filter((r) => r.met).length;
  const level = [...LEVELS].reverse().find((l) => met >= l.min) ?? LEVELS[0];
  const segments = 4;
  const filled = value.length === 0 ? 0 : Math.max(1, Math.round((met / RULES.length) * segments));

  if (!value) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface-2/60 px-4 py-3.5 animate-fade-slide-up">
      <div className="flex items-center gap-2.5">
        <div className="flex gap-1 flex-1">
          {Array.from({ length: segments }, (_, i) => (
            <span
              key={i}
              className={cn("h-1.5 flex-1 rounded-full transition-colors", i < filled ? level.color : "bg-surface-3")}
            />
          ))}
        </div>
        <span className={cn("text-[11px] font-semibold flex-shrink-0", met === RULES.length ? "text-success" : "text-muted")}>
          {level.label}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {rules.map((r) => (
          <li key={r.key} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                r.met ? "bg-success text-white" : "bg-surface-3 text-transparent",
              )}
            >
              <Check size={11} strokeWidth={3} />
            </span>
            <span className={r.met ? "text-ink" : "text-muted"}>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
