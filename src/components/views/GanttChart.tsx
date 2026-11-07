"use client";

import { GanttChartSquare } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/PageHeader";
import { cn } from "@/lib/cn";

export type GanttRow = {
  id: string;
  label: string;
  sublabel?: string;
  start: Date;
  end: Date;
  color: string;
  onClick?: () => void;
};

const DAY = 86400000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function GanttChart({ rows }: { rows: GanttRow[] }) {
  if (rows.length === 0) {
    return (
      <Card padding="none">
        <EmptyState
          icon={<GanttChartSquare size={20} strokeWidth={1.8} />}
          title="Nenhum item na linha do tempo"
          description="Itens com prazo definido aparecem aqui como barras ao longo do tempo."
        />
      </Card>
    );
  }

  const starts = rows.map((r) => startOfDay(r.start).getTime());
  const ends = rows.map((r) => startOfDay(r.end).getTime());
  let rangeStart = Math.min(...starts);
  let rangeEnd = Math.max(...ends);
  if (rangeEnd <= rangeStart) rangeEnd = rangeStart + DAY;
  rangeStart -= DAY * 2;
  rangeEnd += DAY * 2;
  const totalDays = Math.max(1, Math.round((rangeEnd - rangeStart) / DAY));

  const ticks: { label: string; offset: number }[] = [];
  const tickStep = totalDays > 60 ? 14 : totalDays > 25 ? 7 : 2;
  for (let i = 0; i <= totalDays; i += tickStep) {
    const d = new Date(rangeStart + i * DAY);
    ticks.push({
      label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      offset: (i / totalDays) * 100,
    });
  }

  return (
    <Card padding="lg" className="overflow-x-auto">
      <div style={{ minWidth: 720 }}>
        <div className="relative h-6 mb-4 border-b border-dotted border-border-2">
          {ticks.map((t, i) => (
            <span
              key={i}
              className={cn(
                "absolute text-[11px] font-medium text-muted-2",
                t.offset <= 0 ? "translate-x-0" : t.offset >= 100 ? "-translate-x-full" : "-translate-x-1/2",
              )}
              style={{ left: `${t.offset}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-2.5">
          {rows.map((row) => {
            const s = startOfDay(row.start).getTime();
            const e = startOfDay(row.end).getTime();
            const left = ((s - rangeStart) / DAY / totalDays) * 100;
            const width = Math.max(((Math.max(e, s) - s) / DAY / totalDays) * 100, (1 / totalDays) * 100);
            return (
              <div key={row.id} className="flex items-center gap-4">
                <div className="w-44 flex-shrink-0 min-w-0">
                  <p className="text-[13px] font-semibold text-ink truncate">{row.label}</p>
                  {row.sublabel && <p className="text-[11px] text-muted-2 truncate">{row.sublabel}</p>}
                </div>
                <div className="relative flex-1 h-7 rounded-full bg-hatch">
                  <button
                    type="button"
                    onClick={row.onClick}
                    title={row.label}
                    className="absolute inset-y-0 rounded-full cursor-pointer transition-opacity hover:opacity-80"
                    style={{ left: `${left}%`, width: `${width}%`, background: row.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
