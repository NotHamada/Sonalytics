"use client";

import { useTranslations } from "next-intl";
import type { GenreCount } from "@/lib/types";
import InfoTooltip from "./InfoTooltip";
import { BarList } from "./sona/charts";
import { EmptyState, GlassCard } from "./sona/primitives";

export default function GenreChart({ data, tone = "green" }: { data: GenreCount[]; tone?: "green" | "violet" }) {
  const t = useTranslations("history");
  const tFormulas = useTranslations("formulas.history");

  return (
    <GlassCard as="section" aria-label={t("genreBreakdown")} className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight">{t("genreBreakdown")}</h3>
        <InfoTooltip text={tFormulas("genreBreakdown")} />
      </div>
      {data.length === 0 ? (
        <EmptyState title={t("notEnoughGenreData")} />
      ) : (
        <BarList items={data.map((g) => ({ label: g.genre, value: g.count }))} tone={tone} />
      )}
    </GlassCard>
  );
}
