"use client";

import { useTranslations } from "next-intl";
import type { GenrePair } from "@/lib/types";
import InfoTooltip from "./InfoTooltip";

export default function GenrePairsCard({ pairs }: { pairs: GenrePair[] }) {
  const t = useTranslations("history");
  const tFormulas = useTranslations("formulas.history");
  const max = Math.max(1, ...pairs.map((p) => p.count));

  return (
    <div className="glass-card p-5">
      <h2 className="mb-1 flex items-center gap-1.5 text-lg font-semibold text-[var(--text-primary)]">
        {t("genrePairings")}
        <InfoTooltip text={tFormulas("genrePairings")} />
      </h2>
      <p className="mb-4 text-xs text-[var(--text-tertiary)]">{t("genrePairingsSubtitle")}</p>
      {pairs.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">{t("notEnoughGenrePairings")}</p>
      ) : (
        <ul className="space-y-2.5">
          {pairs.map((pair) => (
            <li key={`${pair.genreA}|${pair.genreB}`}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-[var(--text-primary)]">
                  {pair.genreA} <span className="text-[var(--text-tertiary)]">+</span> {pair.genreB}
                </span>
                <span className="tabular-nums text-[var(--text-tertiary)]">{pair.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--divider)]">
                <div
                  className="h-1.5 rounded-full bg-[var(--accent)]"
                  style={{ width: `${(pair.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
