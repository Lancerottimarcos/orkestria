"use client";

import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { PROJECT_STATUS_LABELS } from "@/lib/labels";

type StatusPoint = { status: string; count: number };

const STATUS_COLORS: Record<string, string> = {
  PLANNING: "var(--color-low)",
  IN_PROGRESS: "var(--color-accent)",
  REVIEW: "var(--color-accent-light)",
  DONE: "var(--color-success)",
  CANCELED: "var(--color-danger)",
};

export function ProjectStatusChart({ data }: { data: StatusPoint[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <p className="text-xs text-muted">Nenhum projeto cadastrado.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative flex-shrink-0">
        {data.length === 1 ? (
          <svg width={140} height={140} viewBox="0 0 140 140">
            <circle cx={70} cy={70} r={56} fill="none" stroke={STATUS_COLORS[data[0].status]} strokeWidth={16} />
          </svg>
        ) : (
          <PieChart width={140} height={140}>
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={64}
              paddingAngle={3}
              cornerRadius={6}
              stroke="var(--color-surface)"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const entry = payload[0];
                const pct = (((entry.value as number) / total) * 100).toFixed(0);
                return (
                  <div className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
                    <p className="font-semibold text-ink">
                      {PROJECT_STATUS_LABELS[entry.name as string]}: {entry.value as number} ({pct}%)
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        )}
        <span className="absolute inset-0 flex items-center justify-center text-[28px] font-light tracking-tight text-ink pointer-events-none">
          {total}
        </span>
      </div>
      <div className="flex-1 min-w-[140px] flex flex-col gap-2.5">
        {data.map((entry) => (
          <div key={entry.status} className="flex items-baseline gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 self-center"
              style={{ background: STATUS_COLORS[entry.status] }}
            />
            <span className="text-muted whitespace-nowrap">{PROJECT_STATUS_LABELS[entry.status]}</span>
            <span className="flex-1 border-b border-dotted border-border-2 -translate-y-0.5" />
            <span className="font-semibold text-ink tabular-nums">{entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
