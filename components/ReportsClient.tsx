"use client";

import { ChevronLeft, ChevronRight, Download, ListMusic } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { RankedItem } from "@/lib/historyAnalytics";
import type { GenreCount } from "@/lib/types";
import { shiftPeriodKey, type ReportGranularity } from "@/lib/reportPeriods";
import { CARD_THEMES, DEFAULT_CARD_THEME, resolveCardTheme } from "@/lib/cardThemes";
import StatCard from "./StatCard";
import TopGrid from "./TopGrid";
import Header from "./Header";
import { BarList } from "./sona/charts";
import { Artwork, EmptyState, GlassCard, PageContainer, SectionHeader, ThemeSwatch, pillClass } from "./sona/primitives";
import ShareCardPreview from "./sona/ShareCardPreview";
import { ErrorNotice, LoadingState, NoHistoryCard, NoPlaysCard } from "./sona/states";

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

type PlaylistState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; url: string; trackCount: number }
  | { status: "error"; kind: "reconnect" | "generic"; code?: string };

/** Track ids are the last segment of the Spotify URI ("spotify:track:abc123" -> "abc123"). */
function trackHref(item: RankedItemWithImage): string | null {
  const id = item.trackUri?.split(":").pop();
  return id ? `/track/${id}` : null;
}

function FeaturedCard({
  label,
  item,
  href,
  shape,
}: {
  label: string;
  item?: RankedItemWithImage;
  href: string | null;
  shape: "square" | "circle";
}) {
  const tCommon = useTranslations("common");
  if (!item) return null;

  const body = (
    <GlassCard className="group flex items-center gap-4">
      <div className="w-20 shrink-0">
        <Artwork src={item.image} label={item.name} shape={shape} />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">{label}</p>
        <p className={cn("truncate text-xl font-semibold", href && "group-hover:text-brand")}>{item.name}</p>
        <p className="truncate text-sm text-text-secondary">
          {[item.subtitle, tCommon("units.plays", { count: item.plays }), tCommon("units.minutes", { count: Math.round(item.minutes) })]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </GlassCard>
  );

  return href ? (
    <Link href={href} className="block min-w-0">
      {body}
    </Link>
  ) : (
    body
  );
}

export default function ReportsClient() {
  const t = useTranslations("reports");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [granularity, setGranularity] = useState<ReportGranularity>("month");
  const [requestedKey, setRequestedKey] = useState<string | null>(null);
  const [cardStyle, setCardStyle] = useState(DEFAULT_CARD_THEME);
  const [playlistState, setPlaylistState] = useState<PlaylistState>({ status: "idle" });

  // Don't let a stale success/error banner from a previous period linger after paging to a
  // different one. Adjusting state during render (rather than in an effect) is React's own
  // recommended pattern for this: https://react.dev/learn/you-might-not-need-an-effect
  const [prevPeriodKey, setPrevPeriodKey] = useState(`${granularity}:${requestedKey}`);
  const periodKey = `${granularity}:${requestedKey}`;
  if (periodKey !== prevPeriodKey) {
    setPrevPeriodKey(periodKey);
    setPlaylistState({ status: "idle" });
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const endpoint = granularity === "year" ? "/api/reports/year" : "/api/reports";
        const qs = new URLSearchParams();
        if (requestedKey) qs.set(granularity === "year" ? "year" : "month", requestedKey);
        qs.set("locale", locale);
        const res = await fetch(`${endpoint}?${qs}`, { cache: "no-store" });
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
  }, [granularity, requestedKey, locale]);

  const data = state.status === "ready" ? state.data : null;
  const currentKey = data?.key;

  function changeGranularity(next: ReportGranularity) {
    setGranularity(next);
    setRequestedKey(null);
  }

  async function handleCreatePlaylist() {
    if (!data || data.empty || data.emptyPeriod || !data.key) return;
    setPlaylistState({ status: "loading" });
    try {
      const res = await fetch("/api/reports/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ granularity, period: data.key, locale }),
      });
      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      if (res.status === 403) {
        setPlaylistState({ status: "error", kind: "reconnect" });
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setPlaylistState({ status: "error", kind: "generic", code: body.error });
        return;
      }
      const result = (await res.json()) as { playlistUrl: string; trackCount: number };
      setPlaylistState({ status: "success", url: result.playlistUrl, trackCount: result.trackCount });
    } catch (err) {
      setPlaylistState({ status: "error", kind: "generic", code: err instanceof Error ? err.message : undefined });
    }
  }

  const showControls = !(data && data.empty);

  return (
    <div className="min-h-screen">
      <Header />

      <PageContainer>
        <SectionHeader level={1} eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle", { granularity: t(`granularity.${granularity}`) })} />

        {showControls && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label={t("periodType")} className="glass flex rounded-full p-1">
              {(["month", "year"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={granularity === g}
                  onClick={() => changeGranularity(g)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm capitalize",
                    granularity === g ? "bg-brand font-semibold text-brand-ink" : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  {t(`granularity.${g}`)}
                </button>
              ))}
            </div>
            {currentKey && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRequestedKey(shiftPeriodKey(granularity, currentKey, -1))}
                  disabled={!data || !data.hasPrev}
                  aria-label={t("prevAriaLabel", { granularity: t(`granularity.${granularity}`) })}
                  className="glass grid h-9 w-9 place-items-center rounded-full disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <p className="min-w-36 text-center font-medium" aria-live="polite">
                  {data ? data.label : "…"}
                </p>
                <button
                  type="button"
                  onClick={() => setRequestedKey(shiftPeriodKey(granularity, currentKey, 1))}
                  disabled={!data || !data.hasNext}
                  aria-label={t("nextAriaLabel", { granularity: t(`granularity.${granularity}`) })}
                  className="glass grid h-9 w-9 place-items-center rounded-full disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}

        {state.status === "loading" && <LoadingState label={t("loading")} />}

        {state.status === "error" && <ErrorNotice>{t("loadError", { message: state.message })}</ErrorNotice>}

        {data && data.empty && <NoHistoryCard />}

        {data && !data.empty && data.emptyPeriod && <NoPlaysCard>{t("noPlaysInPeriod", { label: data.label ?? "" })}</NoPlaysCard>}

        {data && !data.empty && !data.emptyPeriod && (
          <>
            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
              <StatCard accent label={tCommon("stats.totalPlays")} value={(data.totalPlays ?? 0).toLocaleString()} />
              <StatCard label={tCommon("stats.totalMinutes")} value={(data.totalMinutes ?? 0).toLocaleString()} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FeaturedCard
                label={t("topArtist")}
                item={data.topArtists?.[0]}
                href={data.topArtists?.[0] ? `/artist/${encodeURIComponent(data.topArtists[0].name)}` : null}
                shape="circle"
              />
              <FeaturedCard
                label={t("topTrack")}
                item={data.topTracks?.[0]}
                href={data.topTracks?.[0] ? trackHref(data.topTracks[0]) : null}
                shape="square"
              />
            </div>

            <GlassCard as="section" aria-labelledby="share-h" className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_auto]">
              <div className="flex flex-col gap-5">
                <div>
                  <h2 id="share-h" className="text-xl font-semibold tracking-tight">
                    {t("shareWrapped")}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">{t("shareDescription", { label: data.label ?? "" })}</p>
                </div>

                <div role="group" aria-label={t("cardTheme")} className="flex gap-2">
                  {CARD_THEMES.map((theme) => (
                    <ThemeSwatch
                      key={theme.id}
                      name={t(`themes.${theme.id}`)}
                      background={theme.heroGradient}
                      selected={cardStyle === theme.id}
                      onSelect={() => setCardStyle(theme.id)}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={`/api/reports/card?granularity=${granularity}&period=${data.key}&style=${cardStyle}&locale=${locale}`}
                    download={`sonalytics-wrapped-${data.key}.png`}
                    className={pillClass("primary")}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {t("downloadCard")}
                  </a>
                  <button
                    type="button"
                    onClick={handleCreatePlaylist}
                    disabled={playlistState.status === "loading"}
                    className={pillClass("secondary")}
                  >
                    <ListMusic className="h-4 w-4" aria-hidden="true" />
                    {playlistState.status === "loading" ? t("creatingPlaylist") : t("createPlaylist")}
                  </button>
                </div>

                {playlistState.status === "success" && (
                  <p className="text-sm text-text-secondary">
                    {t("playlistCreated", { count: playlistState.trackCount })}{" "}
                    <a href={playlistState.url} target="_blank" rel="noreferrer" className="font-semibold text-brand underline underline-offset-4">
                      {t("openInSpotify")}
                    </a>
                  </p>
                )}

                {playlistState.status === "error" && playlistState.kind === "reconnect" && (
                  <p className="text-sm text-danger">
                    {t("reconnectRequired")}{" "}
                    <a href={`/api/auth/login?returnTo=${encodeURIComponent(window.location.pathname)}`} className="font-semibold underline underline-offset-4">
                      {t("reconnectCta")}
                    </a>
                  </p>
                )}

                {playlistState.status === "error" && playlistState.kind === "generic" && (
                  <p className="text-sm text-danger">
                    {playlistState.code === "no_tracks"
                      ? t("playlistNoTracksError")
                      : t("playlistError", { message: playlistState.code ?? "unknown_error" })}
                  </p>
                )}
              </div>

              <ShareCardPreview
                theme={resolveCardTheme(cardStyle)}
                label={data.label ?? ""}
                minutes={(data.totalMinutes ?? 0).toLocaleString(locale)}
                artists={(data.topArtists ?? []).slice(0, 5).map((a) => a.name)}
                tracks={(data.topTracks ?? []).slice(0, 5).map((a) => a.name)}
                heroImage={data.topArtists?.[0]?.image}
              />
            </GlassCard>

            <TopGrid title={t("topArtists")} items={data.topArtists ?? []} imageShape="circle" linkType="artist" />
            <TopGrid title={t("topTracks")} items={data.topTracks ?? []} linkType="track" />

            <GlassCard as="section" aria-label={t("topGenres")} className="flex flex-col gap-4">
              <h3 className="text-base font-semibold">{t("topGenres")}</h3>
              {(data.topGenres ?? []).length === 0 ? (
                <EmptyState title={tCommon("notEnoughData")} />
              ) : (
                <BarList items={(data.topGenres ?? []).map((g) => ({ label: g.genre, value: g.count }))} tone="violet" />
              )}
            </GlassCard>
          </>
        )}
      </PageContainer>
    </div>
  );
}
