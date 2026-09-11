"use client";

import { useEffect, useState } from "react";
import type { DashboardData } from "@/lib/types";
import type { CalendarDay, HistorySummary, RankedItem, TrendPoint } from "@/lib/historyAnalytics";
import StatCard from "./StatCard";
import TopList from "./TopList";
import GenreChart from "./GenreChart";
import HistogramChart from "./HistogramChart";
import CohortBoard from "./CohortBoard";
import GenrePairsCard from "./GenrePairsCard";
import CalendarHeatmap from "./CalendarHeatmap";
import RangeSelector, { computeRangeBounds, type RangePreset } from "./RangeSelector";

interface RankedItemWithImage extends RankedItem {
  image?: string | null;
}

interface HistoryData {
  empty: boolean;
  emptyRange?: boolean;
  summary?: HistorySummary;
  topTracks?: RankedItemWithImage[];
  topArtists?: RankedItemWithImage[];
  trend?: TrendPoint[];
  calendar?: CalendarDay[];
}

type DashboardLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DashboardData };

type HistoryLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: HistoryData };

function RankedList({
  title,
  items,
  showImages = false,
  imageShape = "square",
}: {
  title: string;
  items: RankedItemWithImage[];
  showImages?: boolean;
  imageShape?: "square" | "circle";
}) {
  const max = Math.max(1, ...items.map((i) => i.plays));
  const imageClass = imageShape === "circle" ? "rounded-full" : "rounded-lg";

  return (
    <div className="glass-card p-5">
      <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
      <ol className="space-y-3">
        {items.slice(0, 10).map((item, i) => (
          <li key={`${item.name}-${item.subtitle ?? ""}`}>
            <div className="mb-1 flex items-center gap-3">
              <span className="w-5 shrink-0 text-sm text-[var(--text-tertiary)] tabular-nums">{i + 1}</span>
              {showImages &&
                (item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className={`h-10 w-10 shrink-0 object-cover ${imageClass}`} />
                ) : (
                  <div className={`h-10 w-10 shrink-0 bg-[var(--hover)] ${imageClass}`} />
                ))}
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
            <div
              className="h-1.5 rounded-full bg-[var(--divider)]"
              style={{ marginLeft: showImages ? "84px" : "32px" }}
            >
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
      {children}
    </h2>
  );
}

export default function HistoryClient() {
  const [dashboard, setDashboard] = useState<DashboardLoadState>({ status: "loading" });
  const [history, setHistory] = useState<HistoryLoadState>({ status: "loading" });
  const [preset, setPreset] = useState<RangePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Live Spotify snapshot (top items, genre stats, etc.) — not tied to the history range,
  // so it only needs to load once.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        if (res.status === 401) {
          window.location.href = "/";
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as DashboardData;
        if (!cancelled) setDashboard({ status: "ready", data });
      } catch (err) {
        if (!cancelled) {
          setDashboard({
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

  // Imported history — refetches whenever the selected range changes.
  useEffect(() => {
    if (preset === "custom" && (!customStart || !customEnd)) return;

    let cancelled = false;

    async function load() {
      setHistory({ status: "loading" });
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
        if (!cancelled) setHistory({ status: "ready", data });
      } catch (err) {
        if (!cancelled) {
          setHistory({
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
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Sonalytics
          {dashboard.status === "ready" && (
            <span className="ml-2 hidden font-normal text-[var(--text-tertiary)] sm:inline">
              — {dashboard.data.displayName}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-4">
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
        {dashboard.status === "loading" && (
          <div className="py-12 text-center text-[var(--text-tertiary)]">
            Loading your listening data…
          </div>
        )}

        {dashboard.status === "error" && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
            Couldn&apos;t load your data: {dashboard.message}
          </div>
        )}

        {dashboard.status === "ready" && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Saved Tracks" value={dashboard.data.savedTracksTotal.toLocaleString()} />
              <StatCard
                label="Avg. Track Popularity"
                value={`${dashboard.data.popularitySummary.average}/100`}
                hint={`${dashboard.data.popularitySummary.sampleSize} tracks sampled`}
              />
              <StatCard
                label="Deep Cuts"
                value={`${dashboard.data.popularitySummary.deepCutsPercent}%`}
                hint="Tracks under 40 popularity"
              />
              <StatCard label="Distinct Genres" value={String(dashboard.data.genreDistribution.length)} />
              <StatCard
                label="Taste Diversity"
                value={dashboard.data.diversityIndex.label}
                hint={`Entropy score ${dashboard.data.diversityIndex.score.toFixed(2)}`}
              />
              <StatCard
                label="Era vs. Popularity"
                value={dashboard.data.popularityEraCorrelation.coefficient.toFixed(2)}
                hint={dashboard.data.popularityEraCorrelation.interpretation}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TopList title="Top Artists" entries={dashboard.data.topArtistsByRange} />
              <TopList title="Top Tracks" entries={dashboard.data.topTracksByRange} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <GenreChart data={dashboard.data.genreDistribution} />
              <HistogramChart
                title="Popularity Distribution"
                data={dashboard.data.popularityHistogram}
                barName="Tracks"
                emptyMessage="Not enough top tracks to build a distribution yet."
              />
            </div>

            <HistogramChart
              title="Taste by Decade"
              data={dashboard.data.releaseEraHistogram}
              barName="Tracks"
              emptyMessage="Not enough release-date data yet."
            />

            <div className="space-y-6">
              <SectionHeading>Discovery vs. Loyalty</SectionHeading>
              <CohortBoard title="Artists" cohorts={dashboard.data.artistCohorts} />
              <CohortBoard title="Tracks" cohorts={dashboard.data.trackCohorts} />
            </div>

            <GenrePairsCard pairs={dashboard.data.genrePairs} />
          </>
        )}

        <div className="space-y-6 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SectionHeading>Full History</SectionHeading>
            {!(history.status === "ready" && history.data.empty) && (
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

          {history.status === "loading" && (
            <div className="py-12 text-center text-[var(--text-tertiary)]">
              Loading your imported history…
            </div>
          )}

          {history.status === "error" && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
              Couldn&apos;t load your history: {history.message}
            </div>
          )}

          {history.status === "ready" && history.data.empty && (
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

          {history.status === "ready" && !history.data.empty && history.data.emptyRange && (
            <div className="glass-card p-8 text-center text-[var(--text-secondary)]">
              No plays in this time range.
            </div>
          )}

          {history.status === "ready" &&
            !history.data.empty &&
            !history.data.emptyRange &&
            history.data.summary && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <StatCard label="Total Plays" value={history.data.summary.totalPlays.toLocaleString()} />
                  <StatCard
                    label="Total Minutes"
                    value={history.data.summary.totalMinutes.toLocaleString()}
                  />
                  <StatCard
                    label="Since"
                    value={
                      history.data.summary.earliestPlay
                        ? new Date(history.data.summary.earliestPlay).toLocaleDateString()
                        : "—"
                    }
                  />
                  <StatCard
                    label="Through"
                    value={
                      history.data.summary.latestPlay
                        ? new Date(history.data.summary.latestPlay).toLocaleDateString()
                        : "—"
                    }
                  />
                </div>

                <CalendarHeatmap data={history.data.calendar ?? []} />

                <HistogramChart
                  title="Minutes Over Time"
                  data={(history.data.trend ?? []).map((t) => ({ label: t.label, count: t.minutes }))}
                  barName="Minutes"
                  emptyMessage="Not enough data yet."
                />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <RankedList title="Top Tracks" items={history.data.topTracks ?? []} showImages />
                  <RankedList
                    title="Top Artists"
                    items={history.data.topArtists ?? []}
                    showImages
                    imageShape="circle"
                  />
                </div>
              </div>
            )}
        </div>

        <footer className="pt-4 text-center text-xs text-[var(--text-tertiary)]">
          Data provided by Spotify. This app is not affiliated with or endorsed by Spotify.
        </footer>
      </main>
    </div>
  );
}
