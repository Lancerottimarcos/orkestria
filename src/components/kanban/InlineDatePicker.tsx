"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

const WEEKDAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Calendário de mês inline (sem popover) pra escolher a data de publicação vendo o mês inteiro, em vez de digitar num campo nativo isolado. */
export function InlineDatePicker({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const selected = value ? parseISODate(value) : null;

  const [cursor, setCursor] = useState(() => {
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  // Pula o mês exibido pro mês da data selecionada quando ela muda por fora
  // (ex: um chip de atalho de data) - ajuste durante o render, sem efeito,
  // pra não disparar um segundo ciclo de renderização.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (selected && (cursor.getFullYear() !== selected.getFullYear() || cursor.getMonth() !== selected.getMonth())) {
      setCursor(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
  }

  const startWeekday = cursor.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const daysInPrevMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 0).getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth() - 1, daysInPrevMonth - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d), inMonth: true });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }

  const today = new Date();

  return (
    <div className="flex flex-col gap-2 bg-surface-2 rounded-2xl p-3">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-xs font-bold text-ink">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="w-6 h-6 rounded-full flex items-center justify-center text-muted hover:text-accent hover:bg-surface-3 transition-colors cursor-pointer"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="w-6 h-6 rounded-full flex items-center justify-center text-muted hover:text-accent hover:bg-surface-3 transition-colors cursor-pointer"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LETTERS.map((w, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-muted-2 pb-0.5">
            {w}
          </div>
        ))}
        {cells.map(({ date, inMonth }) => {
          const iso = toISODate(date);
          const isSelected = value === iso;
          const isToday = sameDay(date, today);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onChange(iso)}
              className={cn(
                "aspect-square rounded-full flex items-center justify-center text-xs font-semibold transition-colors cursor-pointer",
                isSelected
                  ? "bg-accent text-black"
                  : inMonth
                    ? "text-ink hover:bg-surface-3"
                    : "text-muted-2/60 hover:bg-surface-3",
                isToday && !isSelected && "ring-1 ring-accent",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
