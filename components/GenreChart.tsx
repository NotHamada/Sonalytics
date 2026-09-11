"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GenreCount } from "@/lib/types";
import { useChartPalette } from "@/lib/useChartPalette";

export default function GenreChart({ data }: { data: GenreCount[] }) {
  const palette = useChartPalette();

  return (
    <div className="glass-card p-5">
      <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Genre Breakdown</h2>
      {data.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">Not enough data to determine genres yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(220, data.length * 32)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} horizontal={false} />
            <XAxis type="number" stroke={palette.text} fontSize={12} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="genre"
              stroke={palette.text}
              fontSize={12}
              width={140}
              tick={{ fill: palette.text }}
            />
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
            <Bar dataKey="count" fill={palette.accent} radius={[0, 4, 4, 0]} name="Artists" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
