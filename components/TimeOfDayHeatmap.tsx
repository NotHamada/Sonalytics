"use client";

import { useLocale, useTranslations } from "next-intl";
import type { HeatmapCell } from "@/lib/historyAnalytics";
import { formatHourLabel, formatWeekdayLabel } from "@/lib/localeFormat";
import InfoTooltip from "./InfoTooltip";

export default function TimeOfDayHeatmap({ data }: { data: HeatmapCell[] }) {
  const t = useTranslations("insights");
  const tCommon = useTranslations("common");
  const tFormulas = useTranslations("formulas.insights");
  const locale = useLocale();
  const max = Math.max(1, ...data.map((c) => c.minutes));
  const grid = new Map(data.map((c) => [`${c.day}-${c.hour}`, c.minutes]));

  const hourLabels = Array.from({ length: 24 }, (_, h) => formatHourLabel(h, locale));
  const weekdayLabels = Array.from({ length: 7 }, (_, day) => formatWeekdayLabel(day, locale));

  const cells: React.ReactNode[] = [];
  cells.push(<div key="corner" />);
  hourLabels.forEach((label, h) => {
    cells.push(
      <div key={`hlabel-${h}`} className="text-center text-[9px] text-[var(--text-tertiary)]">
        {h % 3 === 0 ? label : ""}
      </div>
    );
  });
  weekdayLabels.forEach((label, day) => {
    cells.push(
      <div key={`wlabel-${day}`} className="pr-2 text-xs text-[var(--text-tertiary)]">
        {label}
      </div>
    );
    hourLabels.forEach((_, hour) => {
      const minutes = grid.get(`${day}-${hour}`) ?? 0;
      cells.push(
        <div
          key={`${day}-${hour}`}
          title={`${label} ${hourLabels[hour]} — ${tCommon("units.minutes", { count: minutes })}`}
          className="h-[14px] w-[14px] rounded-[2px]"
          style={{
            background: minutes === 0 ? "var(--divider)" : "var(--accent)",
            opacity: minutes === 0 ? 1 : 0.2 + 0.8 * (minutes / max),
          }}
        />
      );
    });
  });

  return (
    <div className="glass-card p-5">
      <h2 className="mb-1 flex items-center gap-1.5 text-lg font-semibold text-[var(--text-primary)]">
        {t("heatmapTitle")}
        <InfoTooltip text={tFormulas("heatmap")} />
      </h2>
      <p className="mb-4 text-xs text-[var(--text-tertiary)]">{t("heatmapSubtitle")}</p>

      {data.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">{tCommon("notEnoughData")}</p>
      ) : (
        <div className="overflow-x-auto pb-1">
          <div
            className="inline-grid items-center gap-[3px]"
            style={{ gridTemplateColumns: `auto repeat(24, 14px)` }}
          >
            {cells}
          </div>
        </div>
      )}
    </div>
  );
}
