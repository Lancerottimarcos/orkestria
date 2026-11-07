"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { TooltipContentProps } from "recharts";
import { formatDate } from "@/lib/format";

type Point = { date: string; value: number | null };

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-muted mb-1">{formatDate(String(entry.payload.date))}</p>
      <p className="font-semibold text-ink tabular-nums">{Number(entry.value).toLocaleString("pt-BR")}</p>
    </div>
  );
}

export function MetricLineChart({ data, color }: { data: Point[]; color: string }) {
  const points = data.filter((d): d is { date: string; value: number } => d.value != null);

  if (points.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-muted-2">
        Ainda não há dados suficientes pra esse período
      </div>
    );
  }

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="var(--color-muted-2)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatDate(String(v))}
            minTickGap={40}
          />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip content={ChartTooltip} cursor={{ stroke: "var(--color-border)", strokeDasharray: "3 3" }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            dot={false}
            activeDot={{ r: 4, fill: color, strokeWidth: 2, stroke: "var(--color-surface)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
