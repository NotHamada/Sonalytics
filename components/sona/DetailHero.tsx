"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RangeSelector, { type RangePreset } from "../RangeSelector";
import { Artwork, GlassCard } from "./primitives";

/** Back link + date-range selector row shared by the track / artist / album pages. */
export function DetailTopBar({
  showRange,
  preset,
  onPresetChange,
  customStart,
  customEnd,
  onCustomChange,
}: {
  showRange: boolean;
  preset: RangePreset;
  onPresetChange: (preset: RangePreset) => void;
  customStart: string;
  customEnd: string;
  onCustomChange: (start: string, end: string) => void;
}) {
  const tCommon = useTranslations("common");
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/history" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {tCommon("backToFullHistory")}
      </Link>
      {showRange && (
        <RangeSelector
          preset={preset}
          onPresetChange={onPresetChange}
          customStart={customStart}
          customEnd={customEnd}
          onCustomChange={onCustomChange}
        />
      )}
    </div>
  );
}

export function DetailHero({
  kind,
  title,
  image,
  circle,
  meta,
  rank,
}: {
  kind: string;
  title: string;
  image?: string | null;
  circle?: boolean;
  meta?: ReactNode;
  rank?: string;
}) {
  return (
    <GlassCard as="section" aria-label={kind} className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
      <div className="w-40 shrink-0 sm:w-48">
        <Artwork src={image} label={title} shape={circle ? "circle" : "square"} />
      </div>
      <div className="min-w-0 text-center sm:text-left">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-brand">{kind}</p>
        <h1 className="text-title mt-1 break-words">{title}</h1>
        {meta && <p className="mt-2 text-sm text-text-secondary">{meta}</p>}
        {rank && <p className="mt-1 font-mono text-xs text-text-tertiary">{rank}</p>}
      </div>
    </GlassCard>
  );
}

/** Wraps Spotify's embedded player in the shared glass card. */
export function PlayerCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <GlassCard as="section" aria-label={label} className="overflow-hidden p-2">
      {children}
    </GlassCard>
  );
}
