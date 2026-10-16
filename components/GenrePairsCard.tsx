"use client";

import { useTranslations } from "next-intl";
import type { GenrePair } from "@/lib/types";
import InfoTooltip from "./InfoTooltip";
import { BarList } from "./sona/charts";
import { EmptyState, GlassCard } from "./sona/primitives";

export default function GenrePairsCard({ pairs }: { pairs: GenrePair[] }) {
  const t = useTranslations("history");
  const tFormulas = useTranslations("formulas.history");

  return (
    <GlassCard as="section" aria-label={t("genrePairings")} className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{t("genrePairings")}</h3>
          <p className="mt-0.5 text-xs text-text-tertiary">{t("genrePairingsSubtitle")}</p>
        </div>
        <InfoTooltip text={tFormulas("genrePairings")} />
      </div>
      {pairs.length === 0 ? (
        <EmptyState title={t("notEnoughGenrePairings")} />
      ) : (
        <BarList
          items={pairs.map((p) => ({ label: `${p.genreA} + ${p.genreB}`, value: p.count }))}
          tone="violet"
          labelWidth="12rem"
        />
      )}
    </GlassCard>
  );
}
