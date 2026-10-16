"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GlassCard, pillClass } from "./primitives";

/** Page-level loading placeholder: a row of stat-card skeletons plus a chart-card skeleton. */
export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">{label}</span>
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <GlassCard key={i} className="flex flex-col gap-3 p-4 sm:p-5">
            <div className="skeleton h-3 w-20 rounded-md" />
            <div className="skeleton h-8 w-24 rounded-lg" />
          </GlassCard>
        ))}
      </div>
      <GlassCard>
        <div className="skeleton h-56 w-full rounded-2xl" />
      </GlassCard>
    </div>
  );
}

export function ErrorNotice({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
      {children}
    </div>
  );
}

/** Shown when the database has no imported history at all. */
export function NoHistoryCard() {
  const tCommon = useTranslations("common");
  return (
    <GlassCard className="flex flex-col items-center gap-4 py-10 text-center">
      <p className="text-text-secondary">{tCommon("noHistory")}</p>
      <Link href="/import" className={pillClass("primary", "px-6 py-3")}>
        {tCommon("importCta")}
      </Link>
    </GlassCard>
  );
}

/** Shown when history exists but the selected range/period has no plays. */
export function NoPlaysCard({ children }: { children: React.ReactNode }) {
  return <GlassCard className="py-10 text-center text-text-secondary">{children}</GlassCard>;
}
