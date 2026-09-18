"use client";

import { useLocale, useTranslations } from "next-intl";
import type { HourPoint } from "@/lib/historyAnalytics";
import { formatHourLabel } from "@/lib/localeFormat";
import InfoTooltip from "./InfoTooltip";

const PARTS = [
  { key: "night" as const, start: 0, end: 6 },
  { key: "morning" as const, start: 6, end: 12 },
  { key: "afternoon" as const, start: 12, end: 18 },
  { key: "evening" as const, start: 18, end: 24 },
];

export default function DayPartBreakdown({ data }: { data: HourPoint[] }) {
  const t = useTranslations("insights");
  const tCommon = useTranslations("common");
  const tFormulas = useTranslations("formulas.insights");
  const locale = useLocale();
  const totalMinutes = data.reduce((sum, h) => sum + h.minutes, 0);

  const parts = PARTS.map((part) => {
    const minutes = data
      .filter((h) => h.hour >= part.start && h.hour < part.end)
      .reduce((sum, h) => sum + h.minutes, 0);
    const percent = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0;
    const range = `${formatHourLabel(part.start, locale)}–${formatHourLabel(part.end, locale)}`;
    return { ...part, minutes, percent, range };
  });

  return (
    <div className="glass-card p-5">
      <h2 className="mb-1 flex items-center gap-1.5 text-lg font-semibold text-[var(--text-primary)]">
        {t("dayPartTitle")}
        <InfoTooltip text={tFormulas("dayPartBreakdown")} />
      </h2>
      <p className="mb-4 text-xs text-[var(--text-tertiary)]">{t("dayPartSubtitle")}</p>

      {totalMinutes === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">{tCommon("notEnoughData")}</p>
      ) : (
        <div className="space-y-3">
          {parts.map((part) => (
            <div key={part.key}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="font-medium text-[var(--text-primary)]">
                  {t(`dayPart.${part.key}`)} <span className="text-[var(--text-tertiary)]">{part.range}</span>
                </span>
                <span className="tabular-nums text-[var(--text-tertiary)]">{Math.round(part.percent)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--hover)]">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${part.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
