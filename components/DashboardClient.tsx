"use client";

import { useEffect, useState } from "react";
import type { DashboardData } from "@/lib/types";
import StatCard from "./StatCard";
import TopList from "./TopList";
import GenreChart from "./GenreChart";
import HistogramChart from "./HistogramChart";
import ListeningHeatmap from "./ListeningHeatmap";
import CohortBoard from "./CohortBoard";
import GenrePairsCard from "./GenrePairsCard";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DashboardData };

export default function DashboardClient() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          Sonalytics
          {state.status === "ready" && (
            <span className="ml-2 font-normal text-neutral-500">— {state.data.displayName}</span>
          )}
        </h1>
        <div className="flex items-center gap-4">
          <a href="/history" className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
            Full History
          </a>
          <a href="/import" className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
            Import
          </a>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
            >
              Disconnect
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {state.status === "loading" && (
          <div className="py-24 text-center text-neutral-500">Loading your listening data…</div>
        )}

        {state.status === "error" && (
          <div className="rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            Couldn&apos;t load your data: {state.message}
          </div>
        )}

        {state.status === "ready" && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Saved Tracks" value={state.data.savedTracksTotal.toLocaleString()} />
              <StatCard
                label="Avg. Track Popularity"
                value={`${state.data.popularitySummary.average}/100`}
                hint={`${state.data.popularitySummary.sampleSize} tracks sampled`}
              />
              <StatCard
                label="Deep Cuts"
                value={`${state.data.popularitySummary.deepCutsPercent}%`}
                hint="Tracks under 40 popularity"
              />
              <StatCard label="Distinct Genres" value={String(state.data.genreDistribution.length)} />
              <StatCard
                label="Taste Diversity"
                value={state.data.diversityIndex.label}
                hint={`Entropy score ${state.data.diversityIndex.score.toFixed(2)}`}
              />
              <StatCard
                label="Era vs. Popularity"
                value={state.data.popularityEraCorrelation.coefficient.toFixed(2)}
                hint={state.data.popularityEraCorrelation.interpretation}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <TopList title="Top Artists" entries={state.data.topArtistsByRange} />
              <TopList title="Top Tracks" entries={state.data.topTracksByRange} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <GenreChart data={state.data.genreDistribution} />
              <HistogramChart
                title="Popularity Distribution"
                data={state.data.popularityHistogram}
                barName="Tracks"
                emptyMessage="Not enough top tracks to build a distribution yet."
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <HistogramChart
                title="Taste by Decade"
                data={state.data.releaseEraHistogram}
                barName="Tracks"
                emptyMessage="Not enough release-date data yet."
              />
              <ListeningHeatmap items={state.data.recentlyPlayed} />
            </div>

            <div className="space-y-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Discovery vs. Loyalty
              </h2>
              <CohortBoard title="Artists" cohorts={state.data.artistCohorts} />
              <CohortBoard title="Tracks" cohorts={state.data.trackCohorts} />
            </div>

            <GenrePairsCard pairs={state.data.genrePairs} />

            <footer className="pt-4 text-center text-xs text-neutral-600">
              Data provided by Spotify. This app is not affiliated with or endorsed by Spotify.
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
