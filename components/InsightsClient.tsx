"use client";

import { useEffect, useState } from "react";
import type { HeatmapCell, HourPoint, WeekdayPoint } from "@/lib/historyAnalytics";
import StatCard from "./StatCard";
import HistogramChart from "./HistogramChart";
import TimeOfDayHeatmap from "./TimeOfDayHeatmap";
import DayPartBreakdown from "./DayPartBreakdown";
import RangeSelector, { computeRangeBounds, type RangePreset } from "./RangeSelector";

interface InsightsData {
  empty: boolean;
  emptyRange?: boolean;
  byHour?: HourPoint[];
  byWeekday?: WeekdayPoint[];
  heatmap?: HeatmapCell[];
  peakHour?: HourPoint | null;
  peakWeekday?: WeekdayPoint | null;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: InsightsData };

function formatHour(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${period}`;
}

export default function InsightsClient() {
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

        const res = await fetch(`/api/insights?${qs}`, { cache: "no-store" });
        if (res.status === 401) {
          window.location.href = "/";
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as InsightsData;
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
            href="/analysis"
            className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Analysis
          </a>
          <a
            href="/reports"
            className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Reports
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
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Time of Day</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">When you listen, not just what.</p>
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
            Loading your listening patterns…
          </div>
        )}

        {state.status === "error" && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
            Couldn&apos;t load insights: {state.message}
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

        {state.status === "ready" && !state.data.empty && !state.data.emptyRange && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Peak Hour"
                value={state.data.peakHour ? formatHour(state.data.peakHour.hour) : "—"}
                hint={
                  state.data.peakHour ? `${state.data.peakHour.minutes.toLocaleString()} min total` : undefined
                }
                formula="The hour-of-day (0-23, your local time) with the highest total minutes summed across your selected range."
              />
              <StatCard
                label="Peak Day"
                value={state.data.peakWeekday?.label ?? "—"}
                hint={
                  state.data.peakWeekday
                    ? `${state.data.peakWeekday.minutes.toLocaleString()} min total`
                    : undefined
                }
                formula="The day-of-week (your local time) with the highest total minutes summed across your selected range."
              />
            </div>

            <HistogramChart
              title="Listening by Hour of Day"
              formula="Total minutes played, summed by hour-of-day (your local time) across your selected range — a play at 9:15pm on any date adds to the 9pm bucket."
              data={(state.data.byHour ?? []).map((h) => ({ label: h.label, count: h.minutes }))}
              barName="Minutes"
              emptyMessage="Not enough data yet."
            />

            <HistogramChart
              title="Listening by Day of Week"
              formula="Total minutes played, summed by day-of-week (your local time) across your selected range."
              data={(state.data.byWeekday ?? []).map((d) => ({ label: d.label, count: d.minutes }))}
              barName="Minutes"
              emptyMessage="Not enough data yet."
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TimeOfDayHeatmap data={state.data.heatmap ?? []} />
              <DayPartBreakdown data={state.data.byHour ?? []} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
