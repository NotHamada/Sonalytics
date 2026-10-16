"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Granularity, SessionSummary, StreakSummary, TrendBucket } from "@/lib/deepAnalysis";
import type { AnomalyDay, ComparisonResult, CorrelationPair, CorrelationStrength, RegressionResult } from "@/lib/statisticalAnalysis";
import StatCard from "./StatCard";
import HistogramChart from "./HistogramChart";
import InfoTooltip from "./InfoTooltip";
import Header from "./Header";
import RangeSelector, { computeRangeBounds, type RangePreset } from "./RangeSelector";
import { Badge, GlassCard, PageContainer, SectionHeader, type BadgeTone } from "./sona/primitives";
import { ErrorNotice, LoadingState, NoHistoryCard, NoPlaysCard } from "./sona/states";

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

const strengthTone: Record<CorrelationStrength, BadgeTone> = {
  strong: "green",
  moderate: "violet",
  weak: "warn",
  unrelated: "neutral",
};

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

function DayList({ title, subtitle, formula, rows }: { title: string; subtitle: string; formula: string; rows: AnomalyDay[] }) {
  const t = useTranslations("analysis");
  const locale = useLocale();
  return (
    <GlassCard as="section" aria-label={title} className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs text-text-tertiary">{subtitle}</p>
        </div>
        <InfoTooltip text={formula} />
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t("noneStoodOut")}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-text-tertiary">
            <tr>
              <th className="pb-2 font-normal">{t("table.date")}</th>
              <th className="pb-2 text-right font-normal">{t("table.minutes")}</th>
              <th className="pb-2 text-right font-normal">{t("table.z")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date} className="border-t border-divider">
                <td className="py-2">{formatDate(r.date, locale)}</td>
                <td className="py-2 text-right font-mono">{r.minutes}</td>
                <td className="py-2 text-right font-mono text-text-secondary">
                  {r.zScore > 0 ? "+" : ""}
                  {r.zScore.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </GlassCard>
  );
}

function AnalysisBody({ data }: { data: AnalysisData & { sessions: SessionSummary; streaks: StreakSummary } }) {
  const t = useTranslations("analysis");
  const tCommon = useTranslations("common");
  const tFormulas = useTranslations("formulas.analysis");
  const locale = useLocale();

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
  } = data;

  const periodKey: "hour" | "day" | "month" = granularity === "hour" ? "hour" : granularity === "day" ? "day" : "month";
  const periodLabel = t(`period.${periodKey}`);
  const periodPlural = t(`periodPlural.${periodKey}`);
  const periodAdj = t(`periodAdj.${periodKey}`);

  const TrendIcon = trend?.direction === "up" ? ArrowUpRight : trend?.direction === "down" ? ArrowDownRight : ArrowRight;
  const trendTone: BadgeTone = trend?.direction === "up" ? "green" : trend?.direction === "down" ? "warn" : "neutral";

  return (
    <>
      <section aria-label={t("keyStats")} className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
        <StatCard
          accent
          label={t("longestStreak")}
          value={tCommon("units.days", { count: streaks.longest })}
          hint={streaks.longestStart ? `${formatDate(streaks.longestStart, locale)} – ${formatDate(streaks.longestEnd, locale)}` : undefined}
          formula={tFormulas("longestStreak")}
        />
        <StatCard label={t("currentStreak")} value={tCommon("units.days", { count: streaks.current })} formula={tFormulas("currentStreak")} />
        <StatCard label={t("totalSessions")} value={sessions.totalSessions.toLocaleString()} formula={tFormulas("totalSessions")} />
        <StatCard
          label={t("avgSession")}
          value={tCommon("units.minutes", { count: sessions.avgMinutes })}
          hint={t("avgSessionHint", { count: sessions.avgTracks })}
          formula={tFormulas("avgSession")}
        />
        <StatCard label={t("skipRate")} value={`${skipRateOverall}%`} hint={tCommon("shareOfSkippedEarly")} formula={tFormulas("skipRate")} />
        <StatCard label={t("distinctArtists")} value={distinctArtists.toLocaleString()} formula={tFormulas("distinctArtists")} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
          data={(data.skipRateTrend ?? []).map((b) => ({ label: b.label, count: b.value }))}
          barName={t("skipRateBarName")}
          emptyMessage={tCommon("notEnoughData")}
          color="violet"
        />
        <HistogramChart
          title={t("diversityOverTime")}
          subtitle={t("diversitySubtitle", { periodAdj })}
          formula={tFormulas("diversityOverTime")}
          data={(data.diversityTrend ?? []).map((b) => ({ label: b.label, count: b.value }))}
          barName={t("diversityBarName")}
          emptyMessage={tCommon("notEnoughData")}
          color="violet"
        />
        <HistogramChart
          title={t("newArtistsPer", { period: periodLabel })}
          subtitle={t("newArtistsSubtitle")}
          formula={tFormulas("newArtistsPer")}
          data={(data.discoveryVelocity ?? []).map((b) => ({ label: b.label, count: b.value }))}
          barName={t("newArtistsBarName")}
          emptyMessage={tCommon("notEnoughData")}
        />
      </div>

      <section aria-labelledby="stat-h" className="flex flex-col gap-4">
        <h2 id="stat-h" className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t("statisticalHighlights")}
        </h2>

        {(trend || weekdayVsWeekend) && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {trend && (
              <GlassCard as="section" aria-label={t("listeningTrend")} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold">{t("listeningTrend")}</h3>
                  <div className="flex items-center gap-2">
                    <Badge tone={trend.sufficientData ? trendTone : "neutral"}>
                      <TrendIcon className="h-3 w-3" aria-hidden="true" />
                      {trend.direction === "up" ? t("trendUp") : trend.direction === "down" ? t("trendDown") : t("trendFlat")}
                    </Badge>
                    <InfoTooltip text={tFormulas("listeningTrend")} />
                  </div>
                </div>
                <p className="font-mono text-2xl font-semibold">
                  {trend.sufficientData
                    ? `${trend.slopePerPeriod > 0 ? "+" : ""}${Math.round(trend.slopePerPeriod)} ${t("trendUnit", { period: periodLabel.toLowerCase() })}`
                    : "—"}
                </p>
                <p className="text-xs text-text-secondary">
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
              </GlassCard>
            )}

            {weekdayVsWeekend && (
              <GlassCard as="section" aria-label={t("weekdayVsWeekend")} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold">{t("weekdayVsWeekend")}</h3>
                  <div className="flex items-center gap-2">
                    <Badge tone={weekdayVsWeekend.sufficientData && weekdayVsWeekend.significant ? "green" : "neutral"}>
                      {!weekdayVsWeekend.sufficientData
                        ? t("notEnoughBadge")
                        : weekdayVsWeekend.significant
                          ? t("significant")
                          : t("notSignificant")}
                    </Badge>
                    <InfoTooltip text={tFormulas("weekdayVsWeekend")} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-text-tertiary">{t("weekdayMean")}</p>
                    <p className="font-mono text-2xl font-semibold">
                      {weekdayVsWeekend.meanWeekday}
                      <span className="ml-1 text-sm text-text-tertiary">{t("minPerDay")}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">{t("weekendMean")}</p>
                    <p className="font-mono text-2xl font-semibold text-violet">
                      {weekdayVsWeekend.meanWeekend}
                      <span className="ml-1 text-sm text-text-tertiary">{t("minPerDay")}</span>
                    </p>
                  </div>
                </div>
                <p className="text-xs text-text-secondary">
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
              </GlassCard>
            )}
          </div>
        )}

        {correlations.length > 0 && (
          <GlassCard as="section" aria-label={t("correlationHighlights")} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold">{t("correlationHighlights")}</h3>
                <p className="mt-0.5 text-xs text-text-tertiary">{t("correlationSubtitle", { periodAdj })}</p>
              </div>
              <InfoTooltip text={tFormulas("correlationHighlights")} />
            </div>
            <ol className="flex flex-col">
              {correlations.map((c, i) => {
                const metricA = t(`metrics.${c.metricA}`);
                const metricB = t(`metrics.${c.metricB}`);
                const direction = c.coefficient > 0 ? t("correlationDirection.together") : t("correlationDirection.opposite");
                const interpretation =
                  c.strength === "unrelated"
                    ? t("correlationInterpretation.unrelated", { periodAdj })
                    : t(`correlationInterpretation.${c.strength}`, { metricA, metricB, direction });
                return (
                  <li key={`${c.metricA}-${c.metricB}`} className="flex items-center gap-3 border-t border-divider py-3 first:border-t-0">
                    <span className="w-5 font-mono text-xs text-text-tertiary">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {metricA} <span className="text-text-tertiary">×</span> {metricB}
                      </p>
                      <p className="truncate text-xs text-text-tertiary">{interpretation}</p>
                    </div>
                    <span className="font-mono text-sm">{t("correlationValue", { coefficient: c.coefficient.toFixed(2) })}</span>
                    <Badge tone={strengthTone[c.strength]} className="min-w-20 justify-center whitespace-nowrap">
                      {t(`strength.${c.strength}`)}
                    </Badge>
                  </li>
                );
              })}
            </ol>
          </GlassCard>
        )}

        {(spikeDays.length > 0 || quietDays.length > 0) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DayList title={t("spikeDays")} subtitle={t("spikeDaysSubtitle")} formula={tFormulas("spikeDays")} rows={spikeDays} />
            <DayList title={t("quietDays")} subtitle={t("quietDaysSubtitle")} formula={tFormulas("quietDays")} rows={quietDays} />
          </div>
        )}
      </section>
    </>
  );
}

export default function AnalysisClient() {
  const t = useTranslations("analysis");
  const tCommon = useTranslations("common");

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

  const data = state.status === "ready" ? state.data : null;

  return (
    <div className="min-h-screen">
      <Header />

      <PageContainer>
        <SectionHeader
          level={1}
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
          action={
            !(data && data.empty) && (
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
            )
          }
        />

        {state.status === "loading" && <LoadingState label={t("loading")} />}

        {state.status === "error" && <ErrorNotice>{t("loadError", { message: state.message })}</ErrorNotice>}

        {data && data.empty && <NoHistoryCard />}

        {data && !data.empty && data.emptyRange && <NoPlaysCard>{tCommon("noPlaysInRange")}</NoPlaysCard>}

        {data && !data.empty && !data.emptyRange && data.sessions && data.streaks && (
          <AnalysisBody data={{ ...data, sessions: data.sessions, streaks: data.streaks }} />
        )}
      </PageContainer>
    </div>
  );
}
