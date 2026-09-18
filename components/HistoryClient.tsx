"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { DashboardData } from "@/lib/types";
import type { HistorySummary, RankedItem, TrendPoint } from "@/lib/historyAnalytics";
import StatCard from "./StatCard";
import TopGrid from "./TopGrid";
import GenreChart from "./GenreChart";
import HistogramChart from "./HistogramChart";
import CohortBoard from "./CohortBoard";
import GenrePairsCard from "./GenrePairsCard";
import Header from "./Header";
import { Link } from "@/i18n/navigation";
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
  topAlbums?: RankedItemWithImage[];
  trend?: TrendPoint[];
}

type DashboardLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DashboardData };

type HistoryLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: HistoryData };

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
      {children}
    </h2>
  );
}

export default function HistoryClient() {
  const t = useTranslations("history");
  const tCommon = useTranslations("common");
  const tFormulas = useTranslations("formulas.history");
  const locale = useLocale();

  const [dashboard, setDashboard] = useState<DashboardLoadState>({ status: "loading" });
  const [history, setHistory] = useState<HistoryLoadState>({ status: "loading" });
  const [preset, setPreset] = useState<RangePreset>("lifetime");
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
        qs.set("tzOffset", String(new Date().getTimezoneOffset()));

        const res = await fetch(`/api/history?${qs}`, { cache: "no-store" });
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
      <Header
        active="history"
        titleExtra={
          dashboard.status === "ready" && (
            <span className="ml-2 hidden font-normal text-[var(--text-tertiary)] sm:inline">
              — {dashboard.data.displayName}
            </span>
          )
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6 sm:px-6">
        {dashboard.status === "loading" && (
          <div className="py-12 text-center text-[var(--text-tertiary)]">{t("loadingDashboard")}</div>
        )}

        {dashboard.status === "error" && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
            {t("loadErrorDashboard", { message: dashboard.message })}
          </div>
        )}

        {dashboard.status === "ready" && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label={t("savedTracks")} value={dashboard.data.savedTracksTotal.toLocaleString()} />
            <StatCard
              label={t("avgPopularity")}
              value={`${dashboard.data.popularitySummary.average}/100`}
              hint={t("avgPopularityHint", { count: dashboard.data.popularitySummary.sampleSize })}
              formula={tFormulas("avgPopularity")}
            />
            <StatCard
              label={t("deepCuts")}
              value={`${dashboard.data.popularitySummary.deepCutsPercent}%`}
              hint={t("deepCutsHint")}
              formula={tFormulas("deepCuts")}
            />
            <StatCard label={t("distinctGenres")} value={String(dashboard.data.genreDistribution.length)} />
            <StatCard
              label={t("tasteDiversity")}
              value={t(`diversityLabel.${dashboard.data.diversityIndex.label}`)}
              hint={t("tasteDiversityHint", { score: dashboard.data.diversityIndex.score.toFixed(2) })}
              formula={tFormulas("tasteDiversity")}
            />
            <StatCard
              label={t("eraVsPopularity")}
              value={dashboard.data.popularityEraCorrelation.coefficient.toFixed(2)}
              hint={t(`eraCorrelation.${dashboard.data.popularityEraCorrelation.interpretation}`)}
              formula={tFormulas("eraVsPopularity")}
            />
          </div>
        )}

        <div className="space-y-6 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SectionHeading>{t("sectionHeading")}</SectionHeading>
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
            <div className="py-12 text-center text-[var(--text-tertiary)]">{t("loadingHistory")}</div>
          )}

          {history.status === "error" && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
              {t("loadErrorHistory", { message: history.message })}
            </div>
          )}

          {history.status === "ready" && history.data.empty && (
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

          {history.status === "ready" && !history.data.empty && history.data.emptyRange && (
            <div className="glass-card p-8 text-center text-[var(--text-secondary)]">
              {tCommon("noPlaysInRange")}
            </div>
          )}

          {history.status === "ready" &&
            !history.data.empty &&
            !history.data.emptyRange &&
            history.data.summary && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <StatCard label={tCommon("stats.totalPlays")} value={history.data.summary.totalPlays.toLocaleString()} />
                  <StatCard
                    label={tCommon("stats.totalMinutes")}
                    value={history.data.summary.totalMinutes.toLocaleString()}
                  />
                  <StatCard
                    label={tCommon("stats.since")}
                    value={
                      history.data.summary.earliestPlay
                        ? new Date(history.data.summary.earliestPlay).toLocaleDateString(locale)
                        : "—"
                    }
                  />
                  <StatCard
                    label={tCommon("stats.through")}
                    value={
                      history.data.summary.latestPlay
                        ? new Date(history.data.summary.latestPlay).toLocaleDateString(locale)
                        : "—"
                    }
                  />
                </div>

                <HistogramChart
                  title={t("minutesOverTime")}
                  data={(history.data.trend ?? []).map((point) => ({ label: point.label, count: point.minutes }))}
                  barName={tCommon("units.minutesLabel")}
                  emptyMessage={tCommon("notEnoughData")}
                />

                <div className="space-y-6">
                  <TopGrid title={t("topTracks")} items={history.data.topTracks ?? []} linkType="track" />
                  <TopGrid
                    title={t("topArtists")}
                    items={history.data.topArtists ?? []}
                    imageShape="circle"
                    linkType="artist"
                  />
                  <TopGrid title={t("topAlbums")} items={history.data.topAlbums ?? []} linkType="album" />
                </div>
              </div>
            )}
        </div>

        {dashboard.status === "ready" && (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <GenreChart data={dashboard.data.genreDistribution} />
              <HistogramChart
                title={t("popularityDistribution")}
                formula={tFormulas("popularityDistribution")}
                data={dashboard.data.popularityHistogram}
                barName={t("tracksBarName")}
                emptyMessage={t("notEnoughTopTracks")}
              />
            </div>

            <HistogramChart
              title={t("tasteByDecade")}
              formula={tFormulas("tasteByDecade")}
              data={dashboard.data.releaseEraHistogram}
              barName={t("tracksBarName")}
              emptyMessage={t("notEnoughReleaseData")}
            />

            <div className="space-y-6">
              <SectionHeading>{t("discoveryVsLoyalty")}</SectionHeading>
              <CohortBoard title={t("cohorts.artists")} cohorts={dashboard.data.artistCohorts} />
              <CohortBoard title={t("cohorts.tracks")} cohorts={dashboard.data.trackCohorts} />
            </div>

            <GenrePairsCard pairs={dashboard.data.genrePairs} />
          </>
        )}

        <footer className="pt-4 text-center text-xs text-[var(--text-tertiary)]">{tCommon("footer")}</footer>
      </main>
    </div>
  );
}
