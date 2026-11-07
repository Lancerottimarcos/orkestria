"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import type { TooltipContentProps } from "recharts";
import { formatDate } from "@/lib/format";

const SERIES_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)"];

type Series = { key: string; label: string };

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-muted mb-1.5">{formatDate(String(label))}</p>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <p key={String(entry.dataKey)} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            <span className="text-muted">{entry.name}:</span>
            <span className="font-semibold text-ink tabular-nums">
              {entry.value != null ? Number(entry.value).toLocaleString("pt-BR") : "-"}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function MetricAreaChart({
  data,
  series,
}: {
  data: Record<string, string | number | null>[];
  series: Series[];
}) {
  const pointsWithData = data.filter((d) => series.some((s) => typeof d[s.key] === "number")).length;

  if (pointsWithData < 2) {
    return (
      <div className="h-56 flex items-center justify-center text-center text-xs text-muted-2 px-6">
        Ainda coletando dados - o gráfico aparece conforme os próximos dias forem sincronizados.
      </div>
    );
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient id={`metric-area-${s.key}`} x1="0" y1="0" x2="0" y2="1" key={s.key}>
                <stop offset="5%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.35} />
                <stop offset="95%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
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
          <YAxis hide />
          <Tooltip content={ChartTooltip} cursor={{ stroke: "var(--color-border)", strokeDasharray: "3 3" }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "var(--color-muted)", paddingTop: 8 }}
          />
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth={2}
              strokeLinecap="round"
              fill={`url(#metric-area-${s.key})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-surface)" }}
              connectNulls
              animationDuration={1100}
              animationEasing="ease-out"
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
