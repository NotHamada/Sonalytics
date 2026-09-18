"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { RankedItem } from "@/lib/historyAnalytics";
import HistogramChart from "./HistogramChart";
import StatCard from "./StatCard";
import MiniPlayer from "./MiniPlayer";
import TopGrid from "./TopGrid";
import Header from "./Header";
import { Link } from "@/i18n/navigation";
import RangeSelector, { computeRangeBounds, type RangePreset } from "./RangeSelector";

interface RankedItemWithImage extends RankedItem {
  image?: string | null;
}

interface TrendPoint {
  label: string;
  minutes: number;
}

interface AlbumDetailData {
  empty: boolean;
  emptyRange?: boolean;
  notFound?: boolean;
  name?: string;
  artistName?: string | null;
  image?: string | null;
  spotifyId?: string | null;
  totalTracks?: number | null;
  releaseDate?: string | null;
  rank?: number | null;
  totalRanked?: number;
  distinctTracks?: number;
  totalPlays?: number;
  totalMinutes?: number;
  firstPlayed?: string | null;
  lastPlayed?: string | null;
  skipRate?: number;
  trend?: TrendPoint[];
  topTracks?: RankedItemWithImage[];
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: AlbumDetailData };

export default function AlbumDetailClient({ name }: { name: string }) {
  const t = useTranslations("albumDetail");
  const tCommon = useTranslations("common");
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

        const res = await fetch(`/api/album/${encodeURIComponent(name)}?${qs}`, {
          cache: "no-store",
        });
        if (res.status === 401) {
          window.location.href = "/";
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as AlbumDetailData;
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
  }, [name, preset, customStart, customEnd]);

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
                  <Link
                    href={`/artist/${encodeURIComponent(state.data.artistName)}`}
                    className="mt-1 inline-block text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    {state.data.artistName}
                  </Link>
                )}
                {(state.data.releaseDate || state.data.totalTracks != null) && (
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    {[
                      state.data.releaseDate ? state.data.releaseDate.slice(0, 4) : null,
                      state.data.totalTracks != null ? t("trackCount", { count: state.data.totalTracks }) : null,
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

            {(state.data.spotifyId || state.data.topTracks?.[0]?.trackUri) && (
              <div className="glass-card overflow-hidden p-2">
                {state.data.spotifyId ? (
                  <MiniPlayer albumId={state.data.spotifyId} />
                ) : (
                  <MiniPlayer trackId={state.data.topTracks![0].trackUri!.split(":").pop()} />
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label={tCommon("stats.totalPlays")} value={(state.data.totalPlays ?? 0).toLocaleString()} />
              <StatCard label={tCommon("stats.totalMinutes")} value={(state.data.totalMinutes ?? 0).toLocaleString()} />
              <StatCard label={t("distinctTracks")} value={(state.data.distinctTracks ?? 0).toLocaleString()} />
              <StatCard
                label={t("skipRate")}
                value={`${state.data.skipRate ?? 0}%`}
                hint={tCommon("shareOfSkippedEarly")}
              />
            </div>

            <HistogramChart
              title={t("playsOverTime")}
              data={(state.data.trend ?? []).map((point) => ({ label: point.label, count: point.minutes }))}
              barName={tCommon("units.minutesLabel")}
              emptyMessage={tCommon("notEnoughData")}
            />

            <TopGrid
              title={t("tracksOn", { name: state.data.name ?? "" })}
              items={state.data.topTracks ?? []}
              linkType="track"
            />
          </div>
        )}
      </main>
    </div>
  );
}
