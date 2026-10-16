"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import HistogramChart from "./HistogramChart";
import StatCard from "./StatCard";
import MiniPlayer from "./MiniPlayer";
import Header from "./Header";
import { Link } from "@/i18n/navigation";
import { computeRangeBounds, type RangePreset } from "./RangeSelector";
import { DetailHero, DetailTopBar, PlayerCard } from "./sona/DetailHero";
import { PageContainer } from "./sona/primitives";
import { ErrorNotice, LoadingState, NoHistoryCard, NoPlaysCard } from "./sona/states";

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

  const data = state.status === "ready" ? state.data : null;

  const metaParts = data
    ? [
        data.artistName ? (
          <Link key="artist" href={`/artist/${encodeURIComponent(data.artistName)}`} className="hover:text-text-primary hover:underline">
            {data.artistName}
          </Link>
        ) : null,
        data.albumName ? (
          <Link key="album" href={`/album/${encodeURIComponent(data.albumName)}`} className="hover:text-text-primary hover:underline">
            {data.albumName}
          </Link>
        ) : null,
        data.durationMs != null ? formatDuration(data.durationMs) : null,
        data.popularity != null ? t("popularity", { score: data.popularity }) : null,
      ].filter(Boolean)
    : [];

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
              kind={tCommon("kinds.track")}
              title={data.name ?? ""}
              image={data.image}
              meta={metaParts.map((part, i) => (
                <span key={i}>
                  {i > 0 && " · "}
                  {part}
                </span>
              ))}
              rank={data.rank != null ? t("rank", { rank: data.rank, total: data.totalRanked ?? 0 }) : undefined}
            />

            <PlayerCard label={t("player")}>
              <MiniPlayer trackId={id} height={152} />
            </PlayerCard>

            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
              <StatCard accent label={tCommon("stats.totalPlays")} value={(data.totalPlays ?? 0).toLocaleString()} />
              <StatCard label={tCommon("stats.totalMinutes")} value={(data.totalMinutes ?? 0).toLocaleString()} />
              <StatCard label={t("skipRate")} value={`${data.skipRate ?? 0}%`} hint={tCommon("shareOfSkippedEarly")} />
              <StatCard
                label={tCommon("stats.since")}
                value={data.firstPlayed ? new Date(data.firstPlayed).toLocaleDateString(locale) : "—"}
                hint={data.lastPlayed ? t("throughDate", { date: new Date(data.lastPlayed).toLocaleDateString(locale) }) : undefined}
              />
            </div>

            <HistogramChart
              title={t("playsOverTime")}
              data={(data.trend ?? []).map((point) => ({ label: point.label, count: point.minutes }))}
              barName={tCommon("units.minutesLabel")}
              emptyMessage={tCommon("notEnoughData")}
            />
          </>
        )}
      </PageContainer>
    </div>
  );
}
