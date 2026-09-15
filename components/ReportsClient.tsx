"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RankedItem } from "@/lib/historyAnalytics";
import type { GenreCount } from "@/lib/types";
import { shiftMonthKey } from "@/lib/monthlyReport";
import StatCard from "./StatCard";
import TopGrid from "./TopGrid";
import GenreChart from "./GenreChart";

interface RankedItemWithImage extends RankedItem {
  image?: string | null;
}

interface ReportData {
  empty: boolean;
  emptyMonth?: boolean;
  month?: string;
  monthLabel?: string;
  hasPrevMonth?: boolean;
  hasNextMonth?: boolean;
  totalPlays?: number;
  totalMinutes?: number;
  topArtists?: RankedItemWithImage[];
  topTracks?: RankedItemWithImage[];
  topGenres?: GenreCount[];
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ReportData };

/** Track ids are the last segment of the Spotify URI ("spotify:track:abc123" -> "abc123"). */
function trackHref(item: RankedItemWithImage): string | null {
  const id = item.trackUri?.split(":").pop();
  return id ? `/track/${id}` : null;
}

function FeaturedCard({ label, item, href }: { label: string; item?: RankedItemWithImage; href: string | null }) {
  if (!item) return null;
  const content = (
    <div className="glass-card group flex items-center gap-4 p-5">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--hover)] transition-transform group-hover:scale-[1.03]">
        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-[var(--text-tertiary)]">{label}</div>
        <div className="truncate text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
          {item.name}
        </div>
        <div className="truncate text-xs text-[var(--text-tertiary)]">
          {item.plays} {item.plays === 1 ? "play" : "plays"} · {Math.round(item.minutes)} min
          {item.subtitle ? ` · ${item.subtitle}` : ""}
        </div>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block min-w-0">
      {content}
    </Link>
  ) : (
    content
  );
}

export default function ReportsClient() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [requestedMonth, setRequestedMonth] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const qs = requestedMonth ? `?month=${requestedMonth}` : "";
        const res = await fetch(`/api/reports${qs}`, { cache: "no-store" });
        if (res.status === 401) {
          window.location.href = "/";
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as ReportData;
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
  }, [requestedMonth]);

  const currentMonth = state.status === "ready" ? state.data.month : undefined;

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

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Monthly Wrapped</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Your top artists, tracks, and genres — by month.</p>
          </div>
          {!(state.status === "ready" && state.data.empty) && currentMonth && (
            <div className="glass-pill flex items-center gap-2 rounded-full px-3 py-2">
              <button
                type="button"
                onClick={() => setRequestedMonth(shiftMonthKey(currentMonth, -1))}
                disabled={state.status === "ready" && !state.data.hasPrevMonth}
                aria-label="Previous month"
                className="rounded-full p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
              >
                ‹
              </button>
              <span className="min-w-[9rem] text-center text-sm font-medium text-[var(--text-primary)]">
                {state.status === "ready" ? state.data.monthLabel : "…"}
              </span>
              <button
                type="button"
                onClick={() => setRequestedMonth(shiftMonthKey(currentMonth, 1))}
                disabled={state.status === "ready" && !state.data.hasNextMonth}
                aria-label="Next month"
                className="rounded-full p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {state.status === "loading" && (
          <div className="py-12 text-center text-[var(--text-tertiary)]">Loading your wrapped…</div>
        )}

        {state.status === "error" && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
            Couldn&apos;t load this report: {state.message}
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

        {state.status === "ready" && !state.data.empty && state.data.emptyMonth && (
          <div className="glass-card p-8 text-center text-[var(--text-secondary)]">
            No plays in {state.data.monthLabel}.
          </div>
        )}

        {state.status === "ready" && !state.data.empty && !state.data.emptyMonth && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Total Plays" value={(state.data.totalPlays ?? 0).toLocaleString()} />
              <StatCard label="Total Minutes" value={(state.data.totalMinutes ?? 0).toLocaleString()} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FeaturedCard
                label="Top Artist"
                item={state.data.topArtists?.[0]}
                href={
                  state.data.topArtists?.[0]
                    ? `/artist/${encodeURIComponent(state.data.topArtists[0].name)}`
                    : null
                }
              />
              <FeaturedCard
                label="Top Track"
                item={state.data.topTracks?.[0]}
                href={state.data.topTracks?.[0] ? trackHref(state.data.topTracks[0]) : null}
              />
            </div>

            <div className="glass-card flex flex-col items-center gap-3 p-6 text-center">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Share your wrapped</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                A shareable card for {state.data.monthLabel} — your top artists, tracks, and minutes listened.
              </p>
              <a
                href={`/api/reports/card?month=${state.data.month}`}
                download={`sonalytics-wrapped-${state.data.month}.png`}
                className="glow-accent mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03] hover:bg-[var(--accent-2)]"
              >
                Download Card
              </a>
            </div>

            <TopGrid title="Top Artists" items={state.data.topArtists ?? []} linkType="artist" />
            <TopGrid title="Top Tracks" items={state.data.topTracks ?? []} linkType="track" />
            <GenreChart data={state.data.topGenres ?? []} />
          </div>
        )}
      </main>
    </div>
  );
}
