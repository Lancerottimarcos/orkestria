"use client";

import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { cn } from "@/lib/cn";

/**
 * Mini-gráfico decorativo dentro de um KPI tile - sem eixos, sem tooltip.
 * Propositalmente não-interativo: o gráfico completo e interativo já existe
 * mais abaixo no card, isso aqui é só um indicativo visual de tendência.
 */
export function Sparkline({
  data,
  color,
  heightClass = "h-9",
  fillOpacity = 0.3,
}: {
  data: (number | null)[];
  color: string;
  heightClass?: string;
  fillOpacity?: number;
}) {
  const points = data.filter((v): v is number => v != null);
  if (points.length < 2) return <div className={cn("w-full", heightClass)} />;

  const chartData = data.map((value, i) => ({ i, value }));
  const gradientId = `sparkline-${color.replace(/[^a-zA-Z0-9]/g, "")}-${heightClass.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <div className={cn("w-full", heightClass)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={fillOpacity} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive
            animationDuration={900}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
