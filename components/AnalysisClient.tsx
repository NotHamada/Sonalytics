"use client";

import { useEffect, useState } from "react";
import type { Granularity, SessionSummary, StreakSummary, TrendBucket } from "@/lib/deepAnalysis";
import type { AnomalyDay, ComparisonResult, CorrelationPair, RegressionResult } from "@/lib/statisticalAnalysis";
import StatCard from "./StatCard";
import HistogramChart from "./HistogramChart";
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

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export default function AnalysisClient() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [preset, setPreset] = useState<RangePreset>("all");
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
      <header className="glass-pill sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Sonalytics</h1>
        <div className="flex items-center gap-4">
          <a
            href="/history"
            className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Home
          </a>
          <a
            href="/insights"
            className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Insights
          </a>
          <a
            href="/import"
            className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Import
          </a>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Disconnect
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Deep Analysis</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Sessions, streaks, and behavioral trends across your listening history.
            </p>
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
          <div className="py-12 text-center text-[var(--text-tertiary)]">
            Crunching your listening history…
          </div>
        )}

        {state.status === "error" && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
            Couldn&apos;t load analysis: {state.message}
          </div>
        )}

        {state.status === "ready" && state.data.empty && (
          <div className="glass-card p-8 text-center">
            <p className="text-[var(--text-secondary)]">No imported history yet.</p>
            <a
              href="/import"
              className="glow-accent mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.03] hover:bg-[var(--accent-2)]"
            >
              Import your data
            </a>
          </div>
        )}

        {state.status === "ready" && !state.data.empty && state.data.emptyRange && (
          <div className="glass-card p-8 text-center text-[var(--text-secondary)]">
            No plays in this time range.
          </div>
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
            const periodLabel = granularity === "hour" ? "Hour" : granularity === "day" ? "Day" : "Month";
            const periodAdj = granularity === "hour" ? "hourly" : granularity === "day" ? "daily" : "monthly";
            return (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <StatCard
                    label="Longest Streak"
                    value={plural(streaks.longest, "day")}
                    hint={
                      streaks.longestStart
                        ? `${formatDate(streaks.longestStart)} – ${formatDate(streaks.longestEnd)}`
                        : undefined
                    }
                  />
                  <StatCard label="Current Streak" value={plural(streaks.current, "day")} />
                  <StatCard label="Total Sessions" value={sessions.totalSessions.toLocaleString()} />
                  <StatCard
                    label="Avg. Session"
                    value={`${sessions.avgMinutes} min`}
                    hint={`${sessions.avgTracks} tracks avg`}
                  />
                  <StatCard
                    label="Skip Rate"
                    value={`${skipRateOverall}%`}
                    hint="Share of plays skipped early"
                  />
                  <StatCard label="Distinct Artists" value={distinctArtists.toLocaleString()} />
                </div>

                <HistogramChart
                  title={`Sessions per ${periodLabel}`}
                  subtitle="A session is a run of plays with no gap over 30 minutes."
                  data={sessions.trend.map((b) => ({ label: b.label, count: b.value }))}
                  barName="Sessions"
                  emptyMessage="Not enough data yet."
                />

                <HistogramChart
                  title="Skip Rate Over Time"
                  subtitle={`Share of plays skipped early, by ${granularity}.`}
                  data={(state.data.skipRateTrend ?? []).map((b) => ({ label: b.label, count: b.value }))}
                  barName="Skip %"
                  emptyMessage="Not enough data yet."
                />

                <HistogramChart
                  title="Taste Diversity Over Time"
                  subtitle={`0-100 score from your ${periodAdj} artist mix — low means a few artists dominated, high means it was spread evenly.`}
                  data={(state.data.diversityTrend ?? []).map((b) => ({ label: b.label, count: b.value }))}
                  barName="Diversity"
                  emptyMessage="Not enough data yet."
                />

                <HistogramChart
                  title={`New Artists Discovered per ${periodLabel}`}
                  subtitle="Counted against the day each artist first appears anywhere in your history."
                  data={(state.data.discoveryVelocity ?? []).map((b) => ({ label: b.label, count: b.value }))}
                  barName="New Artists"
                  emptyMessage="Not enough data yet."
                />

                <div className="pt-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Statistical Highlights
                  </h2>
                </div>

                {(trend || weekdayVsWeekend) && (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {trend && (
                      <div className="glass-card p-5">
                        <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
                          Listening Trend
                        </h3>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                          {trend.direction === "up" ? "↑ Trending Up" : trend.direction === "down" ? "↓ Trending Down" : "→ Flat"}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">{trend.interpretation}</p>
                      </div>
                    )}

                    {weekdayVsWeekend && (
                      <div className="glass-card p-5">
                        <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
                          Weekday vs. Weekend
                        </h3>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                          {weekdayVsWeekend.meanWeekday} vs {weekdayVsWeekend.meanWeekend} min/day
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">{weekdayVsWeekend.interpretation}</p>
                      </div>
                    )}
                  </div>
                )}

                {correlations.length > 0 && (
                  <div className="glass-card p-5">
                    <h3 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">Correlation Highlights</h3>
                    <p className="mb-4 text-xs text-[var(--text-tertiary)]">
                      Pearson correlation (r) across your {periodAdj} metrics — closer to ±1 means a stronger
                      relationship.
                    </p>
                    <ul className="space-y-3">
                      {correlations.map((c) => (
                        <li
                          key={`${c.metricA}-${c.metricB}`}
                          className="flex items-center justify-between gap-4 border-b border-[var(--divider)] pb-3 last:border-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[var(--text-primary)]">
                              {c.metricA} × {c.metricB}
                            </div>
                            <div className="text-xs text-[var(--text-tertiary)]">{c.interpretation}</div>
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                            r = {c.coefficient.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(spikeDays.length > 0 || quietDays.length > 0) && (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="glass-card p-5">
                      <h3 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">Spike Days</h3>
                      <p className="mb-4 text-xs text-[var(--text-tertiary)]">
                        Days well above your typical active day.
                      </p>
                      {spikeDays.length === 0 ? (
                        <p className="text-sm text-[var(--text-tertiary)]">None stood out.</p>
                      ) : (
                        <ul className="space-y-2">
                          {spikeDays.map((d) => (
                            <li key={d.date} className="flex items-center justify-between text-sm">
                              <span className="text-[var(--text-primary)]">{formatDate(d.date)}</span>
                              <span className="tabular-nums text-[var(--text-tertiary)]">
                                {d.minutes} min · {d.zScore.toFixed(1)}σ
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="glass-card p-5">
                      <h3 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">Quiet Days</h3>
                      <p className="mb-4 text-xs text-[var(--text-tertiary)]">
                        Active days well below your typical listening.
                      </p>
                      {quietDays.length === 0 ? (
                        <p className="text-sm text-[var(--text-tertiary)]">None stood out.</p>
                      ) : (
                        <ul className="space-y-2">
                          {quietDays.map((d) => (
                            <li key={d.date} className="flex items-center justify-between text-sm">
                              <span className="text-[var(--text-primary)]">{formatDate(d.date)}</span>
                              <span className="tabular-nums text-[var(--text-tertiary)]">
                                {d.minutes} min · {d.zScore.toFixed(1)}σ
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
