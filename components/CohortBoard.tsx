"use client";

import { useTranslations } from "next-intl";
import type { CohortBreakdown } from "@/lib/types";
import InfoTooltip from "./InfoTooltip";

function Column({ title, hint, entries }: { title: string; hint: string; entries: CohortBreakdown["core"] }) {
  const tCommon = useTranslations("common");
  return (
    <div>
      <div className="mb-2">
        <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
        <div className="text-xs text-[var(--text-tertiary)]">{hint}</div>
      </div>
      <ul className="space-y-1.5">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={entry.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-[var(--hover)]"
            >
              {entry.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.image} alt="" className="h-8 w-8 rounded-md object-cover shrink-0" />
              ) : (
                <div className="h-8 w-8 rounded-md bg-[var(--hover)] shrink-0" />
              )}
              <span className="truncate text-sm text-[var(--text-primary)]">{entry.name}</span>
            </a>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="px-1.5 py-2 text-xs text-[var(--text-tertiary)]">{tCommon("noneYet")}</li>
        )}
      </ul>
    </div>
  );
}

export default function CohortBoard({ title, cohorts }: { title: string; cohorts: CohortBreakdown }) {
  const t = useTranslations("history");
  const tFormulas = useTranslations("formulas.history");
  return (
    <div className="glass-card p-5">
      <h2 className="mb-1 flex items-center gap-1.5 text-lg font-semibold text-[var(--text-primary)]">
        {title}
        <InfoTooltip text={tFormulas("cohorts")} />
      </h2>
      <p className="mb-4 text-xs text-[var(--text-tertiary)]">{t("cohortsSubtitle")}</p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Column title={t("cohortColumns.core.title")} hint={t("cohortColumns.core.hint")} entries={cohorts.core} />
        <Column
          title={t("cohortColumns.discoveries.title")}
          hint={t("cohortColumns.discoveries.hint")}
          entries={cohorts.discoveries}
        />
        <Column
          title={t("cohortColumns.fading.title")}
          hint={t("cohortColumns.fading.hint")}
          entries={cohorts.fading}
        />
      </div>
    </div>
  );
}
