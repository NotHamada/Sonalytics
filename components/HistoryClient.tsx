"use client";

import { useEffect, useState } from "react";
import StatCard from "./StatCard";
import CalendarHeatmap from "./CalendarHeatmap";
import HistogramChart from "./HistogramChart";
import type { CalendarDay, HistorySummary, MonthlyMinutes, RankedItem } from "@/lib/historyAnalytics";

interface HistoryData {
  empty: boolean;
  summary?: HistorySummary;
  topTracks?: RankedItem[];
  topArtists?: RankedItem[];
  monthlyTrend?: MonthlyMinutes[];
  calendar?: CalendarDay[];
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: HistoryData };

function RankedList({ title, items }: { title: string; items: RankedItem[] }) {
  return (
    <div className="glass-card p-5">
      <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
      <ol className="space-y-2">
        {items.slice(0, 10).map((item, i) => (
          <li key={`${item.name}-${item.subtitle ?? ""}`} className="flex items-center gap-3 px-2 py-1.5">
            <span className="w-5 text-sm text-[var(--text-tertiary)] tabular-nums">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[var(--text-primary)]">{item.name}</div>
              {item.subtitle && (
                <div className="truncate text-xs text-[var(--text-tertiary)]">{item.subtitle}</div>
              )}
            </div>
            <span className="shrink-0 text-xs tabular-nums text-[var(--text-tertiary)]">
              {item.plays} plays
            </span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-2 py-4 text-sm text-[var(--text-tertiary)]">Nothing here yet.</li>
        )}
      </ol>
    </div>
  );
}

export default function HistoryClient() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/history", { cache: "no-store" });
        if (res.status === 401) {
          window.location.href = "/";
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as HistoryData;
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
  }, []);

  return (
    <div className="min-h-screen">
      <header className="glass-pill sticky top-0 z-10 flex items-center justify-between px-6 py-4">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Sonalytics
          <span className="ml-2 font-normal text-[var(--text-tertiary)]">— Full History</span>
        </h1>
        <a
          href="/dashboard"
          className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          Back to dashboard
        </a>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {state.status === "loading" && (
          <div className="py-24 text-center text-[var(--text-tertiary)]">
            Loading your imported history…
          </div>
        )}

        {state.status === "error" && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
            Couldn&apos;t load your history: {state.message}
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

        {state.status === "ready" && !state.data.empty && state.data.summary && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Total Plays" value={state.data.summary.totalPlays.toLocaleString()} />
              <StatCard label="Total Minutes" value={state.data.summary.totalMinutes.toLocaleString()} />
              <StatCard
                label="Since"
                value={
                  state.data.summary.earliestPlay
                    ? new Date(state.data.summary.earliestPlay).toLocaleDateString()
                    : "—"
                }
              />
              <StatCard
                label="Through"
                value={
                  state.data.summary.latestPlay
                    ? new Date(state.data.summary.latestPlay).toLocaleDateString()
                    : "—"
                }
              />
            </div>

            <CalendarHeatmap data={state.data.calendar ?? []} />

            <HistogramChart
              title="Minutes per Month"
              data={(state.data.monthlyTrend ?? []).map((m) => ({ label: m.month.slice(2), count: m.minutes }))}
              barName="Minutes"
              emptyMessage="Not enough data yet."
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <RankedList title="Top Tracks (All Time)" items={state.data.topTracks ?? []} />
              <RankedList title="Top Artists (All Time)" items={state.data.topArtists ?? []} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
