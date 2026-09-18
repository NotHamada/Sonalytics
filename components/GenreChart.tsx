"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GenreCount } from "@/lib/types";
import { useChartPalette } from "@/lib/useChartPalette";
import InfoTooltip from "./InfoTooltip";

export default function GenreChart({ data }: { data: GenreCount[] }) {
  const t = useTranslations("history");
  const tFormulas = useTranslations("formulas.history");
  const palette = useChartPalette();

  return (
    <div className="glass-card p-5">
      <h2 className="mb-4 flex items-center gap-1.5 text-lg font-semibold text-[var(--text-primary)]">
        {t("genreBreakdown")}
        <InfoTooltip text={tFormulas("genreBreakdown")} />
      </h2>
      {data.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">{t("notEnoughGenreData")}</p>
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
            <Bar dataKey="count" fill={palette.accent} radius={[0, 4, 4, 0]} name={t("artistsBarName")} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
