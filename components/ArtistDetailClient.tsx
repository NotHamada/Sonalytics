"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { RankedItem } from "@/lib/historyAnalytics";
import HistogramChart from "./HistogramChart";
import StatCard from "./StatCard";
import MiniPlayer from "./MiniPlayer";
import TopGrid from "./TopGrid";
import Header from "./Header";
import { computeRangeBounds, type RangePreset } from "./RangeSelector";
import { DetailHero, DetailTopBar, PlayerCard } from "./sona/DetailHero";
import { PageContainer } from "./sona/primitives";
import { ErrorNotice, LoadingState, NoHistoryCard, NoPlaysCard } from "./sona/states";

interface RankedItemWithImage extends RankedItem {
  image?: string | null;
}

interface TrendPoint {
  label: string;
  minutes: number;
}

interface ArtistDetailData {
  empty: boolean;
  emptyRange?: boolean;
  notFound?: boolean;
  name?: string;
  image?: string | null;
  genres?: string[];
  followers?: number | null;
  spotifyId?: string | null;
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
  | { status: "ready"; data: ArtistDetailData };

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function ArtistDetailClient({ name }: { name: string }) {
  const t = useTranslations("artistDetail");
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

        const res = await fetch(`/api/artist/${encodeURIComponent(name)}?${qs}`, {
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
        const data = (await res.json()) as ArtistDetailData;
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

  const data = state.status === "ready" ? state.data : null;

  const meta = data
    ? [
        data.followers != null ? t("followers", { count: formatFollowers(data.followers) }) : null,
        data.genres && data.genres.length > 0 ? data.genres.join(", ") : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="min-h-screen">
      <Header />

      <PageContainer>
        <DetailTopBar
          showRange={!(data && data.empty)}
          preset={preset}
          onPresetChange={setPreset}
          customStart={customStart}
          customEnd={customEnd}
          onCustomChange={(start, end) => {
            setCustomStart(start);
            setCustomEnd(end);
          }}
        />

        {state.status === "loading" && <LoadingState label={t("loading")} />}

        {state.status === "error" && <ErrorNotice>{t("loadError", { message: state.message })}</ErrorNotice>}

        {data && data.empty && <NoHistoryCard />}

        {data && !data.empty && (data.emptyRange || data.notFound) && (
          <NoPlaysCard>{data.notFound ? t("notFoundInRange") : tCommon("noPlaysInRange")}</NoPlaysCard>
        )}

        {data && !data.empty && !data.emptyRange && !data.notFound && (
          <>
            <DetailHero
              kind={tCommon("kinds.artist")}
              title={data.name ?? ""}
              image={data.image}
              circle
              meta={meta || undefined}
              rank={data.rank != null ? t("rank", { rank: data.rank, total: data.totalRanked ?? 0 }) : undefined}
            />

            {(data.spotifyId || data.topTracks?.[0]?.trackUri) && (
              <PlayerCard label={t("player")}>
                {data.spotifyId ? (
                  <MiniPlayer artistId={data.spotifyId} />
                ) : (
                  <MiniPlayer trackId={data.topTracks![0].trackUri!.split(":").pop()} />
                )}
              </PlayerCard>
            )}

            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
              <StatCard accent label={tCommon("stats.totalPlays")} value={(data.totalPlays ?? 0).toLocaleString()} />
              <StatCard label={tCommon("stats.totalMinutes")} value={(data.totalMinutes ?? 0).toLocaleString()} />
              <StatCard label={t("distinctTracks")} value={(data.distinctTracks ?? 0).toLocaleString()} />
              <StatCard label={t("skipRate")} value={`${data.skipRate ?? 0}%`} hint={tCommon("shareOfSkippedEarly")} />
            </div>

            <HistogramChart
              title={t("playsOverTime")}
              data={(data.trend ?? []).map((point) => ({ label: point.label, count: point.minutes }))}
              barName={tCommon("units.minutesLabel")}
              emptyMessage={tCommon("notEnoughData")}
            />

            <TopGrid title={t("topTracksBy", { name: data.name ?? "" })} items={data.topTracks ?? []} linkType="track" />
          </>
        )}
      </PageContainer>
    </div>
  );
}
