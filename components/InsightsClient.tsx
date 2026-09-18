"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { HeatmapCell, HourPoint, WeekdayPoint } from "@/lib/historyAnalytics";
import { formatHourLabel } from "@/lib/localeFormat";
import StatCard from "./StatCard";
import HistogramChart from "./HistogramChart";
import TimeOfDayHeatmap from "./TimeOfDayHeatmap";
import DayPartBreakdown from "./DayPartBreakdown";
import Header from "./Header";
import { Link } from "@/i18n/navigation";
import RangeSelector, { computeRangeBounds, type RangePreset } from "./RangeSelector";

interface InsightsData {
  empty: boolean;
  emptyRange?: boolean;
  byHour?: HourPoint[];
  byWeekday?: WeekdayPoint[];
  heatmap?: HeatmapCell[];
  peakHour?: HourPoint | null;
  peakWeekday?: WeekdayPoint | null;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: InsightsData };

export default function InsightsClient() {
  const t = useTranslations("insights");
  const tCommon = useTranslations("common");
  const tFormulas = useTranslations("formulas.insights");
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
        qs.set("locale", locale);

        const res = await fetch(`/api/insights?${qs}`, { cache: "no-store" });
        if (res.status === 401) {
          window.location.href = "/";
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as InsightsData;
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
  }, [preset, customStart, customEnd, locale]);

  return (
    <div className="min-h-screen">
      <Header active="insights" />

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{t("title")}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("subtitle")}</p>
          </div>
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

        {state.status === "ready" && !state.data.empty && state.data.emptyRange && (
          <div className="glass-card p-8 text-center text-[var(--text-secondary)]">{tCommon("noPlaysInRange")}</div>
        )}

        {state.status === "ready" && !state.data.empty && !state.data.emptyRange && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label={t("peakHour")}
                value={state.data.peakHour ? formatHourLabel(state.data.peakHour.hour, locale) : "—"}
                hint={
                  state.data.peakHour
                    ? t("peakHourHint", { minutes: state.data.peakHour.minutes.toLocaleString() })
                    : undefined
                }
                formula={tFormulas("peakHour")}
              />
              <StatCard
                label={t("peakDay")}
                value={state.data.peakWeekday?.label ?? "—"}
                hint={
                  state.data.peakWeekday
                    ? t("peakDayHint", { minutes: state.data.peakWeekday.minutes.toLocaleString() })
                    : undefined
                }
                formula={tFormulas("peakDay")}
              />
            </div>

            <HistogramChart
              title={t("byHour")}
              formula={tFormulas("byHour")}
              data={(state.data.byHour ?? []).map((h) => ({ label: h.label, count: h.minutes }))}
              barName={t("minutesBarName")}
              emptyMessage={tCommon("notEnoughData")}
            />

            <HistogramChart
              title={t("byWeekday")}
              formula={tFormulas("byWeekday")}
              data={(state.data.byWeekday ?? []).map((d) => ({ label: d.label, count: d.minutes }))}
              barName={t("minutesBarName")}
              emptyMessage={tCommon("notEnoughData")}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TimeOfDayHeatmap data={state.data.heatmap ?? []} />
              <DayPartBreakdown data={state.data.byHour ?? []} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
