"use client";

import { useEffect, useState } from "react";
import HistogramChart from "./HistogramChart";
import StatCard from "./StatCard";
import RangeSelector, { computeRangeBounds, type RangePreset } from "./RangeSelector";

interface TrendPoint {
  label: string;
  minutes: number;
}

interface TrackDetailData {
  empty: boolean;
  emptyRange?: boolean;
  notFound?: boolean;
  name?: string;
  artistName?: string | null;
  albumName?: string | null;
  durationMs?: number | null;
  popularity?: number | null;
  image?: string | null;
  rank?: number | null;
  totalRanked?: number;
  totalPlays?: number;
  totalMinutes?: number;
  firstPlayed?: string | null;
  lastPlayed?: string | null;
  skipRate?: number;
  trend?: TrendPoint[];
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: TrackDetailData };

export default function TrackDetailClient({ id }: { id: string }) {
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

        const res = await fetch(`/api/track/${id}${qs.toString() ? `?${qs}` : ""}`, { cache: "no-store" });
        if (res.status === 401) {
          window.location.href = "/";
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as TrackDetailData;
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
  }, [id, preset, customStart, customEnd]);

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
            href="/analysis"
            className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Analysis
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

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <a
            href="/history"
            className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            ‹ Back to Full History
          </a>
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
          <div className="py-12 text-center text-[var(--text-tertiary)]">Loading track…</div>
        )}

        {state.status === "error" && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
            Couldn&apos;t load this track: {state.message}
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

        {state.status === "ready" && !state.data.empty && (state.data.emptyRange || state.data.notFound) && (
          <div className="glass-card p-8 text-center text-[var(--text-secondary)]">
            {state.data.notFound ? "This track wasn't played in this time range." : "No plays in this time range."}
          </div>
        )}

        {state.status === "ready" && !state.data.empty && !state.data.emptyRange && !state.data.notFound && (
          <div className="space-y-6">
            <div className="glass-card flex flex-col items-center gap-6 p-6 text-center sm:flex-row sm:text-left">
              <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl bg-[var(--hover)]">
                {state.data.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={state.data.image} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">{state.data.name}</h2>
                {state.data.artistName && (
                  <a
                    href={`/artist/${encodeURIComponent(state.data.artistName)}`}
                    className="mt-1 inline-block text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    {state.data.artistName}
                  </a>
                )}
                {(state.data.albumName || state.data.durationMs != null || state.data.popularity != null) && (
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    {[
                      state.data.albumName,
                      state.data.durationMs != null ? formatDuration(state.data.durationMs) : null,
                      state.data.popularity != null ? `Popularity ${state.data.popularity}/100` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {state.data.rank != null && (
                  <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                    #{state.data.rank} of {state.data.totalRanked} tracks
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Total Plays" value={(state.data.totalPlays ?? 0).toLocaleString()} />
              <StatCard label="Total Minutes" value={(state.data.totalMinutes ?? 0).toLocaleString()} />
              <StatCard
                label="Skip Rate"
                value={`${state.data.skipRate ?? 0}%`}
                hint="Share of plays skipped early"
              />
              <StatCard
                label="Since"
                value={state.data.firstPlayed ? new Date(state.data.firstPlayed).toLocaleDateString() : "—"}
                hint={
                  state.data.lastPlayed
                    ? `Through ${new Date(state.data.lastPlayed).toLocaleDateString()}`
                    : undefined
                }
              />
            </div>

            <HistogramChart
              title="Plays Over Time"
              data={(state.data.trend ?? []).map((t) => ({ label: t.label, count: t.minutes }))}
              barName="Minutes"
              emptyMessage="Not enough data yet."
            />
          </div>
        )}
      </main>
    </div>
  );
}
