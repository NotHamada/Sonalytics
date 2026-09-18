"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import HistogramChart from "./HistogramChart";
import StatCard from "./StatCard";
import MiniPlayer from "./MiniPlayer";
import Header from "./Header";
import { Link } from "@/i18n/navigation";
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
  const t = useTranslations("trackDetail");
  const tCommon = useTranslations("common");
  const locale = useLocale();
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

        const res = await fetch(`/api/track/${id}?${qs}`, { cache: "no-store" });
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
      <Header hideImport />

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/history"
            className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            {tCommon("backToFullHistory")}
          </Link>
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
          <div className="py-12 text-center text-[var(--text-tertiary)]">{t("loading")}</div>
        )}

        {state.status === "error" && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
            {t("loadError", { message: state.message })}
          </div>
        )}

        {state.status === "ready" && state.data.empty && (
          <div className="glass-card p-8 text-center">
            <p className="text-[var(--text-secondary)]">{tCommon("noHistory")}</p>
            <Link
              href="/import"
              className="glow-accent mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.03] hover:bg-[var(--accent-2)]"
            >
              {tCommon("importCta")}
            </Link>
          </div>
        )}

        {state.status === "ready" && !state.data.empty && (state.data.emptyRange || state.data.notFound) && (
          <div className="glass-card p-8 text-center text-[var(--text-secondary)]">
            {state.data.notFound ? t("notFoundInRange") : tCommon("noPlaysInRange")}
          </div>
        )}

        {state.status === "ready" && !state.data.empty && !state.data.emptyRange && !state.data.notFound && (
          <div className="space-y-6">
            <div className="glass-card flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
              <div className="flex flex-1 flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
                <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl bg-[var(--hover)]">
                  {state.data.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={state.data.image} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">{state.data.name}</h2>
                  {state.data.artistName && (
                    <Link
                      href={`/artist/${encodeURIComponent(state.data.artistName)}`}
                      className="mt-1 inline-block text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      {state.data.artistName}
                    </Link>
                  )}
                  {(state.data.albumName || state.data.durationMs != null || state.data.popularity != null) && (
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      {[
                        state.data.albumName,
                        state.data.durationMs != null ? formatDuration(state.data.durationMs) : null,
                        state.data.popularity != null ? t("popularity", { score: state.data.popularity }) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  {state.data.rank != null && (
                    <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                      {t("rank", { rank: state.data.rank, total: state.data.totalRanked ?? 0 })}
                    </p>
                  )}
                </div>
              </div>

              <div className="w-full sm:w-1/2">
                <MiniPlayer trackId={id} height={80} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label={tCommon("stats.totalPlays")} value={(state.data.totalPlays ?? 0).toLocaleString()} />
              <StatCard label={tCommon("stats.totalMinutes")} value={(state.data.totalMinutes ?? 0).toLocaleString()} />
              <StatCard
                label={t("skipRate")}
                value={`${state.data.skipRate ?? 0}%`}
                hint={tCommon("shareOfSkippedEarly")}
              />
              <StatCard
                label={tCommon("stats.since")}
                value={state.data.firstPlayed ? new Date(state.data.firstPlayed).toLocaleDateString(locale) : "—"}
                hint={
                  state.data.lastPlayed
                    ? t("throughDate", { date: new Date(state.data.lastPlayed).toLocaleDateString(locale) })
                    : undefined
                }
              />
            </div>

            <HistogramChart
              title={t("playsOverTime")}
              data={(state.data.trend ?? []).map((point) => ({ label: point.label, count: point.minutes }))}
              barName={tCommon("units.minutesLabel")}
              emptyMessage={tCommon("notEnoughData")}
            />
          </div>
        )}
      </main>
    </div>
  );
}
