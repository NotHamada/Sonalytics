"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { Artwork, GlassCard } from "./primitives";

export interface CarouselItem {
  key: string;
  title: string;
  subtitle: string;
  image?: string | null;
  /** In-app route (locale-less). Omit for a non-interactive tile. */
  href?: string | null;
}

function ItemLink({ href, children, className }: { href?: string | null; children: ReactNode; className?: string }) {
  if (!href) return <div className={className}>{children}</div>;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

const PAGE_SIZE = 5;

export function Carousel({
  title,
  items,
  shape = "square",
  emptyLabel,
}: {
  title: string;
  items: CarouselItem[];
  shape?: "square" | "circle";
  emptyLabel?: string;
}) {
  const tCommon = useTranslations("common");
  const [page, setPage] = useState(0);

  // Reset to the first page whenever the underlying list changes (e.g. the date range changed) —
  // staying on page 4 of what's now a different, possibly shorter list is confusing. Compared by
  // content (not array identity) because callers build a fresh array every render. Adjusting state
  // during render is React's recommended pattern: https://react.dev/learn/you-might-not-need-an-effect
  const signature = items.map((i) => i.key).join("|");
  const [prevSignature, setPrevSignature] = useState(signature);
  if (signature !== prevSignature) {
    setPrevSignature(signature);
    setPage(0);
  }

  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const start = current * PAGE_SIZE;
  const visible = items.slice(start, start + PAGE_SIZE);

  return (
    <GlassCard as="section" aria-label={title} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {items.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="mr-2 font-mono text-xs text-text-tertiary" aria-live="polite">
              {tCommon("pageRange", { start: start + 1, end: Math.min(start + PAGE_SIZE, items.length), total: items.length })}
            </span>
            <button
              type="button"
              aria-label={`${tCommon("previous")}: ${title}`}
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
              className="grid h-8 w-8 place-items-center rounded-full border border-glass-border text-text-secondary hover:text-text-primary disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`${tCommon("next")}: ${title}`}
              disabled={current >= pages - 1}
              onClick={() => setPage(current + 1)}
              className="grid h-8 w-8 place-items-center rounded-full border border-glass-border text-text-secondary hover:text-text-primary disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-text-tertiary">{emptyLabel ?? tCommon("nothingHereYet")}</p>
      ) : (
        <ol className="no-scrollbar -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible">
          {visible.map((item, i) => (
            <li key={item.key} className="w-32 shrink-0 snap-start sm:w-auto">
              <ItemLink href={item.href} className={cn("group flex flex-col gap-2 rounded-2xl p-1", shape === "circle" && "items-center text-center")}>
                <div className="relative w-full transition-transform group-hover:-translate-y-0.5">
                  <Artwork src={item.image} label={item.title} shape={shape} />
                  <span className="glass-strong absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 font-mono text-[10px]">#{start + i + 1}</span>
                </div>
                <div className="w-full min-w-0">
                  <p className={cn("truncate text-sm font-medium", item.href && "group-hover:text-brand")}>{item.title}</p>
                  <p className="truncate text-xs text-text-tertiary">{item.subtitle}</p>
                </div>
              </ItemLink>
            </li>
          ))}
        </ol>
      )}
    </GlassCard>
  );
}

export interface MiniListItem {
  key: string;
  name: string;
  meta?: string;
  image?: string | null;
  /** External URL (opens in a new tab). */
  url?: string;
}

export function MiniList({
  title,
  hint,
  items,
  tone,
  emptyLabel,
}: {
  title: string;
  hint?: string;
  items: MiniListItem[];
  tone: "green" | "violet" | "warn";
  emptyLabel: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2" title={hint}>
        <span className={cn("h-2 w-2 rounded-full", tone === "green" ? "bg-brand" : tone === "violet" ? "bg-violet" : "bg-warn")} />
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-text-tertiary">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((i) => {
            const body = (
              <>
                <div className="h-9 w-9 shrink-0">
                  <Artwork src={i.image} label={i.name} radius="rounded-lg" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm">{i.name}</p>
                  {i.meta && <p className="truncate text-xs text-text-tertiary">{i.meta}</p>}
                </div>
              </>
            );
            return (
              <li key={i.key} className="min-w-0">
                {i.url ? (
                  <a href={i.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-3 rounded-lg transition-colors hover:text-brand">
                    {body}
                  </a>
                ) : (
                  <div className="flex min-w-0 items-center gap-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
