"use client";

import { useTranslations } from "next-intl";
import type { CohortBreakdown, TopEntryDTO } from "@/lib/types";
import InfoTooltip from "./InfoTooltip";
import { MiniList } from "./sona/collections";
import { GlassCard } from "./sona/primitives";

function toItems(entries: TopEntryDTO[]) {
  return entries.map((e) => ({ key: e.id, name: e.name, meta: e.subtitle || undefined, image: e.image, url: e.url }));
}

export default function CohortBoard({ title, cohorts }: { title: string; cohorts: CohortBreakdown }) {
  const t = useTranslations("history");
  const tCommon = useTranslations("common");
  const tFormulas = useTranslations("formulas.history");
  const empty = tCommon("noneYet");

  return (
    <GlassCard className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold capitalize text-text-secondary">{title}</h3>
        <InfoTooltip text={tFormulas("cohorts")} />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MiniList
          title={t("cohortColumns.core.title")}
          hint={t("cohortColumns.core.hint")}
          items={toItems(cohorts.core)}
          tone="green"
          emptyLabel={empty}
        />
        <MiniList
          title={t("cohortColumns.discoveries.title")}
          hint={t("cohortColumns.discoveries.hint")}
          items={toItems(cohorts.discoveries)}
          tone="violet"
          emptyLabel={empty}
        />
        <MiniList
          title={t("cohortColumns.fading.title")}
          hint={t("cohortColumns.fading.hint")}
          items={toItems(cohorts.fading)}
          tone="warn"
          emptyLabel={empty}
        />
      </div>
    </GlassCard>
  );
}
