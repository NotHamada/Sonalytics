"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HistogramBucket } from "@/lib/types";
import { useChartPalette } from "@/lib/useChartPalette";
import InfoTooltip from "./InfoTooltip";

export default function HistogramChart({
  title,
  subtitle,
  formula,
  data,
  barName,
  emptyMessage,
}: {
  title: string;
  subtitle?: string;
  formula?: string;
  data: HistogramBucket[];
  barName: string;
  emptyMessage: string;
}) {
  const palette = useChartPalette();

  return (
    <div className="glass-card p-5">
      <h2
        className={`flex items-center gap-1.5 text-lg font-semibold text-[var(--text-primary)] ${subtitle ? "mb-1" : "mb-4"}`}
      >
        {title}
        {formula && <InfoTooltip text={formula} />}
      </h2>
      {subtitle && <p className="mb-4 text-xs text-[var(--text-tertiary)]">{subtitle}</p>}
      {data.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">{emptyMessage}</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ left: -20, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
            <XAxis dataKey="label" stroke={palette.text} fontSize={12} />
            <YAxis stroke={palette.text} fontSize={12} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: palette.tooltipBg,
                border: `1px solid ${palette.tooltipBorder}`,
                borderRadius: 12,
                backdropFilter: "blur(12px)",
              }}
              labelStyle={{ color: palette.tooltipLabel }}
              itemStyle={{ color: palette.accent }}
              cursor={{ fill: palette.cursor }}
            />
            <Bar dataKey="count" fill={palette.accent} radius={[4, 4, 0, 0]} name={barName} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
