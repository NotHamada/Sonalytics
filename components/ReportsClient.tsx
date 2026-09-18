"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { RankedItem } from "@/lib/historyAnalytics";
import type { GenreCount } from "@/lib/types";
import { shiftPeriodKey, type ReportGranularity } from "@/lib/reportPeriods";
import { CARD_THEMES, DEFAULT_CARD_THEME } from "@/lib/cardThemes";
import StatCard from "./StatCard";
import TopGrid from "./TopGrid";
import GenreChart from "./GenreChart";
import Header from "./Header";

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
  const tCommon = useTranslations("common");
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
          {tCommon("units.plays", { count: item.plays })} · {tCommon("units.minutes", { count: Math.round(item.minutes) })}
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
  const t = useTranslations("reports");
  const tCommon = useTranslations("common");
  const locale = useLocale();
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

  const currentKey = state.status === "ready" ? state.data.key : undefined;

  function changeGranularity(next: ReportGranularity) {
    setGranularity(next);
    setRequestedKey(null);
  }

  return (
    <div className="min-h-screen">
      <Header active="reports" />

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {granularity === "year" ? t("yearlyWrapped") : t("monthlyWrapped")}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("subtitle", { granularity: t(`granularity.${granularity}`) })}
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
                    {t(`granularity.${g}`)}
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
                  aria-label={t("prevAriaLabel", { granularity: t(`granularity.${granularity}`) })}
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
                  aria-label={t("nextAriaLabel", { granularity: t(`granularity.${granularity}`) })}
                  className="rounded-full p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
                >
                  ›
                </button>
              </div>
            )}
          </div>
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

        {state.status === "ready" && !state.data.empty && state.data.emptyPeriod && (
          <div className="glass-card p-8 text-center text-[var(--text-secondary)]">
            {t("noPlaysInPeriod", { label: state.data.label ?? "" })}
          </div>
        )}

        {state.status === "ready" && !state.data.empty && !state.data.emptyPeriod && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label={tCommon("stats.totalPlays")} value={(state.data.totalPlays ?? 0).toLocaleString()} />
              <StatCard label={tCommon("stats.totalMinutes")} value={(state.data.totalMinutes ?? 0).toLocaleString()} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FeaturedCard
                label={t("topArtist")}
                item={state.data.topArtists?.[0]}
                href={
                  state.data.topArtists?.[0]
                    ? `/artist/${encodeURIComponent(state.data.topArtists[0].name)}`
                    : null
                }
              />
              <FeaturedCard
                label={t("topTrack")}
                item={state.data.topTracks?.[0]}
                href={state.data.topTracks?.[0] ? trackHref(state.data.topTracks[0]) : null}
              />
            </div>

            <div className="glass-card flex flex-col items-center gap-3 p-6 text-center">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t("shareWrapped")}</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {t("shareDescription", { label: state.data.label ?? "" })}
              </p>
              <div className="flex items-center gap-3">
                {CARD_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setCardStyle(theme.id)}
                    aria-label={t(`themes.${theme.id}`)}
                    aria-pressed={cardStyle === theme.id}
                    title={t(`themes.${theme.id}`)}
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
                href={`/api/reports/card?granularity=${granularity}&period=${state.data.key}&style=${cardStyle}&locale=${locale}`}
                download={`sonalytics-wrapped-${state.data.key}.png`}
                className="glow-accent mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03] hover:bg-[var(--accent-2)]"
              >
                {t("downloadCard")}
              </a>
            </div>

            <TopGrid title={t("topArtists")} items={state.data.topArtists ?? []} linkType="artist" />
            <TopGrid title={t("topTracks")} items={state.data.topTracks ?? []} linkType="track" />
            <GenreChart data={state.data.topGenres ?? []} />
          </div>
        )}
      </main>
    </div>
  );
}
