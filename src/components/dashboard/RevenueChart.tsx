"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { formatCurrency } from "@/lib/format";

type TrendPoint = { label: string; income: number; expense: number };

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-ink mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={String(entry.name)} className="flex items-center gap-1.5" style={{ color: entry.color }}>
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted">{entry.name}:</span>
          <span className="font-semibold text-ink tabular-nums">{formatCurrency(Number(entry.value))}</span>
        </p>
      ))}
    </div>
  );
}

export function RevenueChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="flex h-[260px] flex-col gap-2">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--color-muted-2)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dy={6}
            />
            <YAxis
              stroke="var(--color-muted-2)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
            />
            <Tooltip
              content={ChartTooltip}
              cursor={{ fill: "color-mix(in srgb, var(--color-ink) 6%, transparent)" }}
            />
            <Bar dataKey="income" name="Entradas" fill="var(--color-accent)" radius={[8, 8, 8, 8]} barSize={12} />
            <Line
              type="monotone"
              dataKey="expense"
              name="Saídas"
              stroke="var(--color-muted-2)"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 4, fill: "var(--color-muted-2)", strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-end gap-5 pr-1">
        <span className="flex items-center gap-2 text-xs text-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-accent flex-shrink-0" />
          Entradas
        </span>
        <span className="flex items-center gap-2 text-xs text-muted">
          <span className="w-4 border-t-2 border-dashed border-muted-2 flex-shrink-0" />
          Saídas
        </span>
      </div>
    </div>
  );
}
