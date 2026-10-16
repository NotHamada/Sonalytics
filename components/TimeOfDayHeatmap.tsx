"use client";

import { useLocale, useTranslations } from "next-intl";
import type { HeatmapCell } from "@/lib/historyAnalytics";
import { formatWeekdayLabel } from "@/lib/localeFormat";
import InfoTooltip from "./InfoTooltip";
import { Heatmap } from "./sona/charts";
import { EmptyState, GlassCard } from "./sona/primitives";

export default function TimeOfDayHeatmap({ data }: { data: HeatmapCell[] }) {
  const t = useTranslations("insights");
  const tCommon = useTranslations("common");
  const tFormulas = useTranslations("formulas.insights");
  const locale = useLocale();

  const grid = new Map(data.map((c) => [`${c.day}-${c.hour}`, c.minutes]));
  const weekdayLabels = Array.from({ length: 7 }, (_, day) => formatWeekdayLabel(day, locale));
  const rows = weekdayLabels.map((_, day) => Array.from({ length: 24 }, (_, hour) => grid.get(`${day}-${hour}`) ?? 0));

  return (
    <GlassCard as="section" aria-label={t("heatmapTitle")} className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{t("heatmapTitle")}</h3>
          <p className="mt-0.5 text-xs text-text-tertiary">{t("heatmapSubtitle")}</p>
        </div>
        <InfoTooltip text={tFormulas("heatmap")} />
      </div>
      {data.length === 0 ? (
        <EmptyState title={tCommon("notEnoughData")} />
      ) : (
        <Heatmap
          rows={rows}
          rowLabels={weekdayLabels}
          ariaLabel={t("heatmapTitle")}
          cellTitle={(label, hour, minutes) => `${label} ${String(hour).padStart(2, "0")}:00 · ${tCommon("units.minutes", { count: minutes })}`}
          lessLabel={t("heatmapLess")}
          moreLabel={t("heatmapMore")}
        />
      )}
    </GlassCard>
  );
}
