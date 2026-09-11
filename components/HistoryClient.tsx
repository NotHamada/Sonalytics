"use client";

import { useEffect, useState } from "react";
import StatCard from "./StatCard";
import CalendarHeatmap from "./CalendarHeatmap";
import HistogramChart from "./HistogramChart";
import RangeSelector, { computeRangeBounds, type RangePreset } from "./RangeSelector";
import type { CalendarDay, HistorySummary, RankedItem, TrendPoint } from "@/lib/historyAnalytics";

interface HistoryData {
  empty: boolean;
  emptyRange?: boolean;
  summary?: HistorySummary;
  topTracks?: RankedItem[];
  topArtists?: RankedItem[];
  trend?: TrendPoint[];
  calendar?: CalendarDay[];
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: HistoryData };

function RankedList({ title, items }: { title: string; items: RankedItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.plays));

  return (
    <div className="glass-card p-5">
      <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
      <ol className="space-y-3">
        {items.slice(0, 10).map((item, i) => (
          <li key={`${item.name}-${item.subtitle ?? ""}`}>
            <div className="mb-1 flex items-center gap-3">
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
            </div>
            <div className="ml-8 h-1.5 rounded-full bg-[var(--divider)]">
              <div
                className="h-1.5 rounded-full bg-[var(--accent)]"
                style={{ width: `${(item.plays / max) * 100}%` }}
              />
            </div>
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

        const res = await fetch(`/api/history${qs.toString() ? `?${qs}` : ""}`, { cache: "no-store" });
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
  }, [preset, customStart, customEnd]);

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
        {state.status !== "loading" && !(state.status === "ready" && state.data.empty) && (
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

        {state.status === "ready" && !state.data.empty && state.data.emptyRange && (
          <div className="glass-card p-8 text-center text-[var(--text-secondary)]">
            No plays in this time range.
          </div>
        )}

        {state.status === "ready" && !state.data.empty && !state.data.emptyRange && state.data.summary && (
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
              title="Minutes Over Time"
              data={(state.data.trend ?? []).map((t) => ({ label: t.label, count: t.minutes }))}
              barName="Minutes"
              emptyMessage="Not enough data yet."
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <RankedList title="Top Tracks" items={state.data.topTracks ?? []} />
              <RankedList title="Top Artists" items={state.data.topArtists ?? []} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
