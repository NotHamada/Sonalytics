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
import RangeSelector, { computeRangeBounds, type RangePreset } from "./RangeSelector";
import { PageContainer, SectionHeader } from "./sona/primitives";
import { ErrorNotice, LoadingState, NoHistoryCard, NoPlaysCard } from "./sona/states";

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

  const data = state.status === "ready" ? state.data : null;

  return (
    <div className="min-h-screen">
      <Header />

      <PageContainer>
        <SectionHeader
          level={1}
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
          action={
            !(data && data.empty) && (
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

        {state.status === "loading" && <LoadingState label={t("loading")} />}

        {state.status === "error" && <ErrorNotice>{t("loadError", { message: state.message })}</ErrorNotice>}

        {data && data.empty && <NoHistoryCard />}

        {data && !data.empty && data.emptyRange && <NoPlaysCard>{tCommon("noPlaysInRange")}</NoPlaysCard>}

        {data && !data.empty && !data.emptyRange && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard
                accent
                label={t("peakHour")}
                value={data.peakHour ? formatHourLabel(data.peakHour.hour, locale) : "—"}
                hint={data.peakHour ? t("peakHourHint", { minutes: data.peakHour.minutes.toLocaleString() }) : undefined}
                formula={tFormulas("peakHour")}
              />
              <StatCard
                label={t("peakDay")}
                value={data.peakWeekday?.label ?? "—"}
                hint={data.peakWeekday ? t("peakDayHint", { minutes: data.peakWeekday.minutes.toLocaleString() }) : undefined}
                formula={tFormulas("peakDay")}
              />
            </div>

            <HistogramChart
              title={t("byHour")}
              subtitle={t("byHourSubtitle")}
              formula={tFormulas("byHour")}
              data={(data.byHour ?? []).map((h) => ({ label: h.label, count: h.minutes }))}
              barName={t("minutesBarName")}
              emptyMessage={tCommon("notEnoughData")}
              xInterval={2}
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
              <HistogramChart
                title={t("byWeekday")}
                formula={tFormulas("byWeekday")}
                data={(data.byWeekday ?? []).map((d) => ({ label: d.label, count: d.minutes }))}
                barName={t("minutesBarName")}
                emptyMessage={tCommon("notEnoughData")}
                color="violet"
                xInterval={0}
              />
              <DayPartBreakdown data={data.byHour ?? []} />
            </div>

            <TimeOfDayHeatmap data={data.heatmap ?? []} />
          </>
        )}
      </PageContainer>
    </div>
  );
}
