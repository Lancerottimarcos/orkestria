"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarHeart, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Panel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  getDatesForMonth,
  type CommemorativeCategory,
  type CommemorativeDate,
} from "@/lib/commemorativeDates";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const CATEGORY_ORDER: CommemorativeCategory[] = ["nacional", "internacional", "comercial"];

function DateRow({ date, year, month }: { date: CommemorativeDate; year: number; month: number }) {
  const color = CATEGORY_COLORS[date.category];
  const weekday = WEEKDAY_SHORT[new Date(year, month - 1, date.day).getDay()];
  return (
    <div className="flex items-start gap-4 py-4">
      <div
        className="w-12 h-12 rounded-full flex flex-col items-center justify-center flex-shrink-0"
        style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
      >
        <span className="text-base font-semibold leading-none">{date.day}</span>
        <span className="text-[9px] font-medium mt-0.5">{weekday}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-panel-ink leading-snug">{date.title}</p>
        {date.note && (
          <p className="text-xs text-panel-muted mt-1.5 flex items-start gap-1.5">
            <Sparkles size={11} className="flex-shrink-0 mt-0.5" />
            {date.note}
          </p>
        )}
      </div>
    </div>
  );
}

export function DatesCalendarView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12

  function goToToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  }

  const dates = useMemo(() => getDatesForMonth(year, month), [year, month]);
  const grouped = useMemo(() => {
    const byCategory = new Map<CommemorativeCategory, CommemorativeDate[]>();
    for (const d of dates) {
      const list = byCategory.get(d.category) ?? [];
      list.push(d);
      byCategory.set(d.category, list);
    }
    return byCategory;
  }, [dates]);
  const byDay = useMemo(() => {
    const map = new Map<number, CommemorativeDate[]>();
    for (const d of dates) {
      const list = map.get(d.day) ?? [];
      list.push(d);
      map.set(d.day, list);
    }
    return map;
  }, [dates]);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  return (
    <div>
      <PageHeader
        title="Datas Comemorativas"
        description="Navegue por mês e ano para ver as principais datas e planejar campanhas, posts e estratégias."
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 items-start">
        <Card padding="none" className="p-4 sm:p-8">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
            <div className="flex items-baseline gap-2.5">
              <p className="text-[28px] font-light tracking-tight leading-none text-ink">
                {MONTH_NAMES[month - 1]}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setYear((y) => y - 1)}
                  title="Ano anterior"
                  className="text-muted hover:text-accent cursor-pointer transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="text-sm font-medium text-muted tabular-nums">{year}</span>
                <button
                  type="button"
                  onClick={() => setYear((y) => y + 1)}
                  title="Próximo ano"
                  className="text-muted hover:text-accent cursor-pointer transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isCurrentMonth && (
                <Button type="button" variant="subtle" size="sm" onClick={goToToday}>
                  Mês atual
                </Button>
              )}
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                title="Mês anterior"
                className="w-10 h-10 rounded-full bg-surface-2 text-muted hover:text-ink flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                title="Próximo mês"
                className="w-10 h-10 rounded-full bg-surface-2 text-muted hover:text-ink flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {WEEKDAY_SHORT.map((w) => (
              <p key={w} className="text-center text-[13px] font-medium text-muted py-1.5">
                {w}
              </p>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`blank-${i}`} className="rounded-2xl min-h-[84px]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const weekdayIndex = (firstWeekday + i) % 7;
              const isWeekend = weekdayIndex === 0 || weekdayIndex === 6;
              const isToday = isCurrentMonth && day === now.getDate();
              const dayDates = byDay.get(day) ?? [];
              return (
                <div
                  key={day}
                  className={cn(
                    "rounded-2xl min-h-[84px] p-1.5 flex flex-col gap-1 overflow-hidden",
                    isWeekend ? "bg-hatch" : "bg-surface-2/50",
                  )}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0",
                      isToday ? "bg-accent text-black font-semibold" : "text-muted font-medium",
                    )}
                  >
                    {day}
                  </span>
                  {dayDates.map((d) => {
                    const color = CATEGORY_COLORS[d.category];
                    return (
                      <span
                        key={`${d.day}-${d.title}`}
                        title={d.title}
                        className="rounded-full px-2 py-1 text-[10px] font-semibold leading-none truncate"
                        style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
                      >
                        {d.title}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </Card>

        <Panel padding="none" className="p-4 sm:p-8">
          {dates.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
              <span className="w-14 h-14 rounded-full bg-panel-2 flex items-center justify-center text-panel-muted">
                <CalendarHeart size={20} strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-sm font-semibold text-panel-ink">Nenhuma data cadastrada para este mês</p>
                <p className="text-xs text-panel-muted mt-1.5">Tente outro mês no seletor acima.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5 mb-5">
                <span className="text-[40px] font-light leading-none tracking-tight text-panel-ink">
                  {dates.length}
                </span>
                <span className="text-sm text-panel-muted">
                  {dates.length === 1 ? "data" : "datas"} neste mês
                </span>
              </div>

              {CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((cat) => (
                <section key={cat} className="mt-2">
                  <p className="text-[13px] font-medium text-panel-muted flex items-center gap-2 pt-3">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[cat] }} />
                    {CATEGORY_LABELS[cat]}
                  </p>
                  <div className="flex flex-col">
                    {grouped.get(cat)!.map((d, index) => (
                      <div key={`${d.month}-${d.day}-${d.title}`}>
                        {index > 0 && <div className="border-t border-dotted border-panel-2" />}
                        <DateRow date={d} year={year} month={month} />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
