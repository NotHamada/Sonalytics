"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Granularity, SessionSummary, StreakSummary, TrendBucket } from "@/lib/deepAnalysis";
import type { AnomalyDay, ComparisonResult, CorrelationPair, RegressionResult } from "@/lib/statisticalAnalysis";
import StatCard from "./StatCard";
import HistogramChart from "./HistogramChart";
import InfoTooltip from "./InfoTooltip";
import Header from "./Header";
import { Link } from "@/i18n/navigation";
import RangeSelector, { computeRangeBounds, type RangePreset } from "./RangeSelector";

interface AnalysisData {
  empty: boolean;
  emptyRange?: boolean;
  granularity?: Granularity;
  sessions?: SessionSummary;
  streaks?: StreakSummary;
  skipRateOverall?: number;
  skipRateTrend?: TrendBucket[];
  diversityTrend?: TrendBucket[];
  discoveryVelocity?: TrendBucket[];
  distinctArtists?: number;
  trend?: RegressionResult;
  weekdayVsWeekend?: ComparisonResult;
  correlations?: CorrelationPair[];
  spikeDays?: AnomalyDay[];
  quietDays?: AnomalyDay[];
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: AnalysisData };

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

export default function AnalysisClient() {
  const t = useTranslations("analysis");
  const tCommon = useTranslations("common");
  const tFormulas = useTranslations("formulas.analysis");
  const locale = useLocale();

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [preset, setPreset] = useState<RangePreset>("lifetime");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    if (preset === "custom" && (!customStart || !customEnd)) return;

    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const bounds = computeRangeBounds(preset, customStart, customEnd);
        const qs = new URLSearchParams();
        if (bounds.start) qs.set("start", bounds.start);
        if (bounds.end) qs.set("end", bounds.end);
        qs.set("tzOffset", String(new Date().getTimezoneOffset()));

        const res = await fetch(`/api/analysis?${qs}`, { cache: "no-store" });
        if (res.status === 401) {
          window.location.href = "/";
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as AnalysisData;
        if (!cancelled) setState({ status: "ready", data });
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Something went wrong.",
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [preset, customStart, customEnd]);

  return (
    <div className="min-h-screen">
      <Header active="analysis" />

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{t("title")}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("subtitle")}</p>
          </div>
          {!(state.status === "ready" && state.data.empty) && (
            <RangeSelector
              preset={preset}
              onPresetChange={setPreset}
              customStart={customStart}
              customEnd={customEnd}
              onCustomChange={(start, end) => {
                setCustomStart(start);
                setCustomEnd(end);
              }}
            />
          )}
        </div>

        {state.status === "loading" && (
          <div className="py-12 text-center text-[var(--text-tertiary)]">{t("loading")}</div>
        )}

        {state.status === "error" && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
            {t("loadError", { message: state.message })}
          </div>
        )}

        {state.status === "ready" && state.data.empty && (
          <div className="glass-card p-8 text-center">
            <p className="text-[var(--text-secondary)]">{tCommon("noHistory")}</p>
            <Link
              href="/import"
              className="glow-accent mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.03] hover:bg-[var(--accent-2)]"
            >
              {tCommon("importCta")}
            </Link>
          </div>
        )}

        {state.status === "ready" && !state.data.empty && state.data.emptyRange && (
          <div className="glass-card p-8 text-center text-[var(--text-secondary)]">{tCommon("noPlaysInRange")}</div>
        )}

        {state.status === "ready" &&
          !state.data.empty &&
          !state.data.emptyRange &&
          state.data.sessions &&
          state.data.streaks &&
          (() => {
            const {
              sessions,
              streaks,
              skipRateOverall = 0,
              distinctArtists = 0,
              trend,
              weekdayVsWeekend,
              correlations = [],
              spikeDays = [],
              quietDays = [],
              granularity = "month",
            } = state.data;
            const periodKey: "hour" | "day" | "month" =
              granularity === "hour" ? "hour" : granularity === "day" ? "day" : "month";
            const periodLabel = t(`period.${periodKey}`);
            const periodPlural = t(`periodPlural.${periodKey}`);
            const periodAdj = t(`periodAdj.${periodKey}`);
            return (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <StatCard
                    label={t("longestStreak")}
                    value={tCommon("units.days", { count: streaks.longest })}
                    hint={
                      streaks.longestStart
                        ? `${formatDate(streaks.longestStart, locale)} – ${formatDate(streaks.longestEnd, locale)}`
                        : undefined
                    }
                    formula={tFormulas("longestStreak")}
                  />
                  <StatCard
                    label={t("currentStreak")}
                    value={tCommon("units.days", { count: streaks.current })}
                    formula={tFormulas("currentStreak")}
                  />
                  <StatCard
                    label={t("totalSessions")}
                    value={sessions.totalSessions.toLocaleString()}
                    formula={tFormulas("totalSessions")}
                  />
                  <StatCard
                    label={t("avgSession")}
                    value={tCommon("units.minutes", { count: sessions.avgMinutes })}
                    hint={t("avgSessionHint", { count: sessions.avgTracks })}
                    formula={tFormulas("avgSession")}
                  />
                  <StatCard
                    label={t("skipRate")}
                    value={`${skipRateOverall}%`}
                    hint={tCommon("shareOfSkippedEarly")}
                    formula={tFormulas("skipRate")}
                  />
                  <StatCard
                    label={t("distinctArtists")}
                    value={distinctArtists.toLocaleString()}
                    formula={tFormulas("distinctArtists")}
                  />
                </div>

                <HistogramChart
                  title={t("sessionsPer", { period: periodLabel })}
                  subtitle={t("sessionsSubtitle")}
                  formula={tFormulas("sessionsPer")}
                  data={sessions.trend.map((b) => ({ label: b.label, count: b.value }))}
                  barName={t("sessionsBarName")}
                  emptyMessage={tCommon("notEnoughData")}
                />

                <HistogramChart
                  title={t("skipRateOverTime")}
                  subtitle={t("skipRateSubtitle", { periodAdj })}
                  formula={tFormulas("skipRateOverTime")}
                  data={(state.data.skipRateTrend ?? []).map((b) => ({ label: b.label, count: b.value }))}
                  barName={t("skipRateBarName")}
                  emptyMessage={tCommon("notEnoughData")}
                />

                <HistogramChart
                  title={t("diversityOverTime")}
                  subtitle={t("diversitySubtitle", { periodAdj })}
                  formula={tFormulas("diversityOverTime")}
                  data={(state.data.diversityTrend ?? []).map((b) => ({ label: b.label, count: b.value }))}
                  barName={t("diversityBarName")}
                  emptyMessage={tCommon("notEnoughData")}
                />

                <HistogramChart
                  title={t("newArtistsPer", { period: periodLabel })}
                  subtitle={t("newArtistsSubtitle")}
                  formula={tFormulas("newArtistsPer")}
                  data={(state.data.discoveryVelocity ?? []).map((b) => ({ label: b.label, count: b.value }))}
                  barName={t("newArtistsBarName")}
                  emptyMessage={tCommon("notEnoughData")}
                />

                <div className="pt-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    {t("statisticalHighlights")}
                  </h2>
                </div>

                {(trend || weekdayVsWeekend) && (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {trend && (
                      <div className="glass-card p-5">
                        <h3 className="mb-2 flex items-center gap-1.5 text-lg font-semibold text-[var(--text-primary)]">
                          {t("listeningTrend")}
                          <InfoTooltip text={tFormulas("listeningTrend")} />
                        </h3>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                          {trend.direction === "up" ? t("trendUp") : trend.direction === "down" ? t("trendDown") : t("trendFlat")}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {!trend.sufficientData
                            ? t("trendInterpretation.notEnough", { periodPlural })
                            : trend.direction === "flat"
                              ? t("trendInterpretation.flat", { count: trend.periodsAnalyzed, periodPlural, r2: trend.r2.toFixed(2) })
                              : t("trendInterpretation.trending", {
                                  direction: trend.direction,
                                  slope: Math.round(Math.abs(trend.slopePerPeriod)),
                                  periodUnit: periodLabel.toLowerCase(),
                                  count: trend.periodsAnalyzed,
                                  periodPlural,
                                  r2: trend.r2.toFixed(2),
                                })}
                        </p>
                      </div>
                    )}

                    {weekdayVsWeekend && (
                      <div className="glass-card p-5">
                        <h3 className="mb-2 flex items-center gap-1.5 text-lg font-semibold text-[var(--text-primary)]">
                          {t("weekdayVsWeekend")}
                          <InfoTooltip text={tFormulas("weekdayVsWeekend")} />
                        </h3>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                          {t("weekdayVsWeekendValue", {
                            weekday: weekdayVsWeekend.meanWeekday,
                            weekend: weekdayVsWeekend.meanWeekend,
                          })}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {!weekdayVsWeekend.sufficientData
                            ? t("weekdayVsWeekendInterpretation.notEnough")
                            : weekdayVsWeekend.significant
                              ? t("weekdayVsWeekendInterpretation.significant", {
                                  higher: weekdayVsWeekend.meanWeekday > weekdayVsWeekend.meanWeekend ? t("weekdays") : t("weekends"),
                                  pValue: weekdayVsWeekend.pValue.toFixed(3),
                                })
                              : t("weekdayVsWeekendInterpretation.notSignificant", {
                                  pValue: weekdayVsWeekend.pValue.toFixed(3),
                                })}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {correlations.length > 0 && (
                  <div className="glass-card p-5">
                    <h3 className="mb-1 flex items-center gap-1.5 text-lg font-semibold text-[var(--text-primary)]">
                      {t("correlationHighlights")}
                      <InfoTooltip text={tFormulas("correlationHighlights")} />
                    </h3>
                    <p className="mb-4 text-xs text-[var(--text-tertiary)]">
                      {t("correlationSubtitle", { periodAdj })}
                    </p>
                    <ul className="space-y-3">
                      {correlations.map((c) => {
                        const metricA = t(`metrics.${c.metricA}`);
                        const metricB = t(`metrics.${c.metricB}`);
                        const direction = c.coefficient > 0 ? t("correlationDirection.together") : t("correlationDirection.opposite");
                        const interpretation =
                          c.strength === "unrelated"
                            ? t("correlationInterpretation.unrelated", { periodAdj })
                            : t(`correlationInterpretation.${c.strength}`, { metricA, metricB, direction });
                        return (
                          <li
                            key={`${c.metricA}-${c.metricB}`}
                            className="flex items-center justify-between gap-4 border-b border-[var(--divider)] pb-3 last:border-0 last:pb-0"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-[var(--text-primary)]">
                                {metricA} × {metricB}
                              </div>
                              <div className="text-xs text-[var(--text-tertiary)]">{interpretation}</div>
                            </div>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                              {t("correlationValue", { coefficient: c.coefficient.toFixed(2) })}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {(spikeDays.length > 0 || quietDays.length > 0) && (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="glass-card p-5">
                      <h3 className="mb-1 flex items-center gap-1.5 text-lg font-semibold text-[var(--text-primary)]">
                        {t("spikeDays")}
                        <InfoTooltip text={tFormulas("spikeDays")} />
                      </h3>
                      <p className="mb-4 text-xs text-[var(--text-tertiary)]">{t("spikeDaysSubtitle")}</p>
                      {spikeDays.length === 0 ? (
                        <p className="text-sm text-[var(--text-tertiary)]">{t("noneStoodOut")}</p>
                      ) : (
                        <ul className="space-y-2">
                          {spikeDays.map((d) => (
                            <li key={d.date} className="flex items-center justify-between text-sm">
                              <span className="text-[var(--text-primary)]">{formatDate(d.date, locale)}</span>
                              <span className="tabular-nums text-[var(--text-tertiary)]">
                                {t("dayStat", { minutes: d.minutes, zScore: d.zScore.toFixed(1) })}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="glass-card p-5">
                      <h3 className="mb-1 flex items-center gap-1.5 text-lg font-semibold text-[var(--text-primary)]">
                        {t("quietDays")}
                        <InfoTooltip text={tFormulas("quietDays")} />
                      </h3>
                      <p className="mb-4 text-xs text-[var(--text-tertiary)]">{t("quietDaysSubtitle")}</p>
                      {quietDays.length === 0 ? (
                        <p className="text-sm text-[var(--text-tertiary)]">{t("noneStoodOut")}</p>
                      ) : (
                        <ul className="space-y-2">
                          {quietDays.map((d) => (
                            <li key={d.date} className="flex items-center justify-between text-sm">
                              <span className="text-[var(--text-primary)]">{formatDate(d.date, locale)}</span>
                              <span className="tabular-nums text-[var(--text-tertiary)]">
                                {t("dayStat", { minutes: d.minutes, zScore: d.zScore.toFixed(1) })}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
      </main>
    </div>
  );
}
