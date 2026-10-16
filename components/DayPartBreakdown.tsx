"use client";

import { useLocale, useTranslations } from "next-intl";
import type { HourPoint } from "@/lib/historyAnalytics";
import { formatHourLabel } from "@/lib/localeFormat";
import InfoTooltip from "./InfoTooltip";
import { EmptyState, GlassCard, ProgressBar } from "./sona/primitives";

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
    <GlassCard as="section" aria-label={t("dayPartTitle")} className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{t("dayPartTitle")}</h3>
          <p className="mt-0.5 text-xs text-text-tertiary">{t("dayPartSubtitle")}</p>
        </div>
        <InfoTooltip text={tFormulas("dayPartBreakdown")} />
      </div>

      {totalMinutes === 0 ? (
        <EmptyState title={tCommon("notEnoughData")} />
      ) : (
        <ul className="flex flex-col gap-5">
          {parts.map((part) => (
            <li key={part.key} className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span>
                  {t(`dayPart.${part.key}`)} <span className="ml-1 font-mono text-xs text-text-tertiary">{part.range}</span>
                </span>
                <span className="font-mono">{Math.round(part.percent)}%</span>
              </div>
              <ProgressBar value={part.percent} label={t(`dayPart.${part.key}`)} />
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
