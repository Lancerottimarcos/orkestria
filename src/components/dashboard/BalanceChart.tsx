"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Cell,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { formatCurrency } from "@/lib/format";

type TrendPoint = { label: string; income: number; expense: number };

function BalanceTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-ink mb-1">{label}</p>
      <p className={value >= 0 ? "text-success font-semibold tabular-nums" : "text-danger font-semibold tabular-nums"}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

export function BalanceChart({ data }: { data: TrendPoint[] }) {
  const chartData = data.map((d) => ({ label: d.label, balance: d.income - d.expense }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="var(--color-muted-2)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          dy={6}
        />
        <ReferenceLine y={0} stroke="var(--color-border)" strokeDasharray="4 4" />
        <Tooltip content={BalanceTooltip} cursor={{ fill: "color-mix(in srgb, var(--color-ink) 6%, transparent)" }} />
        <Bar dataKey="balance" radius={[8, 8, 8, 8]} barSize={12}>
          {chartData.map((entry) => (
            <Cell
              key={entry.label}
              fill={entry.balance >= 0 ? "var(--color-success)" : "var(--color-danger)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
