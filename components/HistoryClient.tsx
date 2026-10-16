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
import RangeSelector, { computeRangeBounds, type RangePreset } from "./RangeSelector";
import { GlassCard, PageContainer, SectionHeader } from "./sona/primitives";
import { ErrorNotice, LoadingState, NoHistoryCard, NoPlaysCard } from "./sona/states";

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

  const historyData = history.status === "ready" ? history.data : null;

  return (
    <div className="min-h-screen">
      <Header
        titleExtra={
          dashboard.status === "ready" && (
            <span className="hidden truncate rounded-full bg-glass-strong px-2.5 py-0.5 text-xs text-text-secondary sm:inline">
              {dashboard.data.displayName}
            </span>
          )
        }
      />

      <PageContainer>
        <SectionHeader
          level={1}
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
          action={
            !(historyData && historyData.empty) && (
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
            )
          }
        />

        {dashboard.status === "loading" && (
          <div role="status" aria-live="polite" className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <span className="sr-only">{t("loadingDashboard")}</span>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <GlassCard key={i} className="flex flex-col gap-3 p-4 sm:p-5">
                <div className="skeleton h-3 w-20 rounded-md" />
                <div className="skeleton h-8 w-24 rounded-lg" />
              </GlassCard>
            ))}
          </div>
        )}

        {dashboard.status === "error" && <ErrorNotice>{t("loadErrorDashboard", { message: dashboard.message })}</ErrorNotice>}

        {dashboard.status === "ready" && (
          <section aria-label={t("quickFacts")} className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
          </section>
        )}

        {history.status === "loading" && <LoadingState label={t("loadingHistory")} />}

        {history.status === "error" && <ErrorNotice>{t("loadErrorHistory", { message: history.message })}</ErrorNotice>}

        {historyData && historyData.empty && <NoHistoryCard />}

        {historyData && !historyData.empty && historyData.emptyRange && <NoPlaysCard>{tCommon("noPlaysInRange")}</NoPlaysCard>}

        {historyData && !historyData.empty && !historyData.emptyRange && historyData.summary && (
          <>
            <section aria-label={t("summary")} className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
              <StatCard accent label={tCommon("stats.totalPlays")} value={historyData.summary.totalPlays.toLocaleString()} />
              <StatCard label={tCommon("stats.totalMinutes")} value={historyData.summary.totalMinutes.toLocaleString()} />
              <StatCard
                label={tCommon("stats.since")}
                value={historyData.summary.earliestPlay ? new Date(historyData.summary.earliestPlay).toLocaleDateString(locale) : "—"}
              />
              <StatCard
                label={tCommon("stats.through")}
                value={historyData.summary.latestPlay ? new Date(historyData.summary.latestPlay).toLocaleDateString(locale) : "—"}
              />
            </section>

            <HistogramChart
              title={t("minutesOverTime")}
              subtitle={t("minutesOverTimeSubtitle")}
              data={(historyData.trend ?? []).map((point) => ({ label: point.label, count: point.minutes }))}
              barName={tCommon("units.minutesLabel")}
              emptyMessage={tCommon("notEnoughData")}
            />

            <TopGrid title={t("topTracks")} items={historyData.topTracks ?? []} linkType="track" />
            <TopGrid title={t("topArtists")} items={historyData.topArtists ?? []} imageShape="circle" linkType="artist" />
            <TopGrid title={t("topAlbums")} items={historyData.topAlbums ?? []} linkType="album" />
          </>
        )}

        {dashboard.status === "ready" && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <GenreChart data={dashboard.data.genreDistribution} />
              <HistogramChart
                title={t("popularityDistribution")}
                subtitle={t("popularityDistributionSubtitle")}
                formula={tFormulas("popularityDistribution")}
                data={dashboard.data.popularityHistogram}
                barName={t("tracksBarName")}
                emptyMessage={t("notEnoughTopTracks")}
                color="violet"
                height={280}
                xInterval={1}
              />
            </div>

            <HistogramChart
              title={t("tasteByDecade")}
              subtitle={t("tasteByDecadeSubtitle")}
              formula={tFormulas("tasteByDecade")}
              data={dashboard.data.releaseEraHistogram}
              barName={t("tracksBarName")}
              emptyMessage={t("notEnoughReleaseData")}
              xInterval={0}
            />

            <section aria-label={t("discoveryVsLoyalty")} className="flex flex-col gap-4">
              <SectionHeader title={t("discoveryVsLoyalty")} subtitle={t("cohortsSubtitle")} />
              <CohortBoard title={t("cohorts.artists")} cohorts={dashboard.data.artistCohorts} />
              <CohortBoard title={t("cohorts.tracks")} cohorts={dashboard.data.trackCohorts} />
            </section>

            <GenrePairsCard pairs={dashboard.data.genrePairs} />
          </>
        )}

        <footer className="pt-4 text-center text-xs text-text-tertiary">{tCommon("footer")}</footer>
      </PageContainer>
    </div>
  );
}
