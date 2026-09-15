"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RankedItem } from "@/lib/historyAnalytics";
import type { GenreCount } from "@/lib/types";
import { shiftPeriodKey, type ReportGranularity } from "@/lib/reportPeriods";
import { CARD_THEMES, DEFAULT_CARD_THEME } from "@/lib/cardThemes";
import StatCard from "./StatCard";
import TopGrid from "./TopGrid";
import GenreChart from "./GenreChart";

interface RankedItemWithImage extends RankedItem {
  image?: string | null;
}

interface ReportData {
  empty: boolean;
  emptyPeriod?: boolean;
  key?: string;
  label?: string;
  hasPrev?: boolean;
  hasNext?: boolean;
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
  const [granularity, setGranularity] = useState<ReportGranularity>("month");
  const [requestedKey, setRequestedKey] = useState<string | null>(null);
  const [cardStyle, setCardStyle] = useState(DEFAULT_CARD_THEME);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const endpoint = granularity === "year" ? "/api/reports/year" : "/api/reports";
        const qs = requestedKey ? `?${granularity === "year" ? "year" : "month"}=${requestedKey}` : "";
        const res = await fetch(`${endpoint}${qs}`, { cache: "no-store" });
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
  }, [granularity, requestedKey]);

  const currentKey = state.status === "ready" ? state.data.key : undefined;

  function changeGranularity(next: ReportGranularity) {
    setGranularity(next);
    setRequestedKey(null);
  }

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
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {granularity === "year" ? "Yearly Wrapped" : "Monthly Wrapped"}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Your top artists, tracks, and genres — by {granularity}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!(state.status === "ready" && state.data.empty) && (
              <div className="glass-pill flex items-center gap-1 rounded-full p-1">
                {(["month", "year"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => changeGranularity(g)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                      granularity === g
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
            {!(state.status === "ready" && state.data.empty) && currentKey && (
              <div className="glass-pill flex items-center gap-2 rounded-full px-3 py-2">
                <button
                  type="button"
                  onClick={() => setRequestedKey(shiftPeriodKey(granularity, currentKey, -1))}
                  disabled={state.status === "ready" && !state.data.hasPrev}
                  aria-label={`Previous ${granularity}`}
                  className="rounded-full p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
                >
                  ‹
                </button>
                <span className="min-w-[9rem] text-center text-sm font-medium text-[var(--text-primary)]">
                  {state.status === "ready" ? state.data.label : "…"}
                </span>
                <button
                  type="button"
                  onClick={() => setRequestedKey(shiftPeriodKey(granularity, currentKey, 1))}
                  disabled={state.status === "ready" && !state.data.hasNext}
                  aria-label={`Next ${granularity}`}
                  className="rounded-full p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
                >
                  ›
                </button>
              </div>
            )}
          </div>
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

        {state.status === "ready" && !state.data.empty && state.data.emptyPeriod && (
          <div className="glass-card p-8 text-center text-[var(--text-secondary)]">
            No plays in {state.data.label}.
          </div>
        )}

        {state.status === "ready" && !state.data.empty && !state.data.emptyPeriod && (
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
                A shareable card for {state.data.label} — your top artists, tracks, and minutes listened.
              </p>
              <div className="flex items-center gap-3">
                {CARD_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setCardStyle(theme.id)}
                    aria-label={theme.label}
                    aria-pressed={cardStyle === theme.id}
                    title={theme.label}
                    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      cardStyle === theme.id
                        ? "border-[var(--accent)] scale-110"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                    style={{ background: theme.swatch }}
                  />
                ))}
              </div>
              <a
                href={`/api/reports/card?granularity=${granularity}&period=${state.data.key}&style=${cardStyle}`}
                download={`sonalytics-wrapped-${state.data.key}.png`}
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
