"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

export type CalendarEvent = {
  id: string;
  date: Date;
  label: string;
  color: string;
  onClick?: () => void;
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function MiniCalendar({ events }: { events: CalendarEvent[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-light tracking-tight leading-none text-ink">
          {MONTHS[month]} <span className="text-muted">{year}</span>
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:text-ink hover:bg-surface-3 transition-colors cursor-pointer"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-surface-2 text-muted hover:text-ink hover:bg-surface-3 transition-colors cursor-pointer"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:text-ink hover:bg-surface-3 transition-colors cursor-pointer"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[13px] font-medium text-muted py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="min-h-[92px] rounded-2xl bg-hatch opacity-50" />;
          const dayEvents = events.filter((e) => sameDay(e.date, date));
          const isToday = sameDay(date, today);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          return (
            <div
              key={i}
              className={cn(
                "min-h-[92px] rounded-2xl p-2 flex flex-col gap-1.5",
                isToday ? "bg-accent/10" : isWeekend ? "bg-hatch" : "bg-surface-2/50",
              )}
            >
              <span
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold",
                  isToday ? "bg-accent text-black" : "text-muted",
                )}
              >
                {date.getDate()}
              </span>
              <div className="flex flex-col gap-1 overflow-y-auto">
                {dayEvents.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={e.onClick}
                    title={e.label}
                    className="text-left text-[10px] font-semibold px-2.5 py-1 rounded-full truncate cursor-pointer"
                    style={{ background: `color-mix(in srgb, ${e.color} 13%, transparent)`, color: e.color }}
                  >
                    {e.label}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-muted-2 px-2">+{dayEvents.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
