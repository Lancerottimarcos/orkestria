"use client";

import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { POST_STATUS_LABELS, POST_STATUS_COLORS } from "@/lib/labels";

type StatusPoint = { status: string; count: number };

export function ApprovalStatusChart({ data, size = 160 }: { data: StatusPoint[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <p className="text-xs text-muted">Nenhuma aprovação registrada ainda.</p>
      </div>
    );
  }

  const inner = size * 0.34;
  const outer = size * 0.46;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative flex-shrink-0">
        {data.length === 1 ? (
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={(inner + outer) / 2}
              fill="none"
              stroke={POST_STATUS_COLORS[data[0].status]}
              strokeWidth={outer - inner}
            />
          </svg>
        ) : (
          <PieChart width={size} height={size}>
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              innerRadius={inner}
              outerRadius={outer}
              paddingAngle={3}
              cornerRadius={6}
              stroke="var(--color-surface)"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={POST_STATUS_COLORS[entry.status]} />
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
                      {POST_STATUS_LABELS[entry.name as string]}: {entry.value as number} ({pct}%)
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        )}
        <span className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[28px] font-light tracking-tight leading-none text-ink">{total}</span>
          <span className="text-[11px] text-muted mt-1">total</span>
        </span>
      </div>
      <div className="flex-1 min-w-[140px] flex flex-col gap-2.5">
        {data.map((entry) => (
          <div key={entry.status} className="flex items-baseline gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 self-center"
              style={{ background: POST_STATUS_COLORS[entry.status] }}
            />
            <span className="text-muted whitespace-nowrap">{POST_STATUS_LABELS[entry.status]}</span>
            <span className="flex-1 border-b border-dotted border-border-2 -translate-y-0.5" />
            <span className="font-semibold text-ink tabular-nums">{entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
