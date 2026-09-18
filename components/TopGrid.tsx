"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { RankedItem } from "@/lib/historyAnalytics";

interface RankedItemWithImage extends RankedItem {
  image?: string | null;
}

const PAGE_SIZE = 5;

/** Track ids are the last segment of the Spotify URI ("spotify:track:abc123" -> "abc123"). */
function trackHref(item: RankedItemWithImage): string | null {
  const id = item.trackUri?.split(":").pop();
  return id ? `/track/${id}` : null;
}

function artistHref(item: RankedItemWithImage): string {
  return `/artist/${encodeURIComponent(item.name)}`;
}

function albumHref(item: RankedItemWithImage): string {
  return `/album/${encodeURIComponent(item.name)}`;
}

export default function TopGrid({
  title,
  items,
  imageShape = "square",
  metric = "plays",
  linkType,
}: {
  title: string;
  items: RankedItemWithImage[];
  imageShape?: "square" | "circle";
  metric?: "plays" | "minutes";
  /** When set, each card links to that item's detail page. */
  linkType?: "track" | "artist" | "album";
}) {
  const tCommon = useTranslations("common");
  const [page, setPage] = useState(0);
  const imageClass = imageShape === "circle" ? "rounded-full" : "rounded-xl";

  // Reset to the first page whenever the underlying list changes (e.g. the date range filter
  // changed) — staying on page 4 of what's now a different, possibly shorter list is confusing.
  // Adjusting state during render (rather than in an effect) is React's own recommended
  // pattern for this: https://react.dev/learn/you-might-not-need-an-effect
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setPage(0);
  }

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const start = clampedPage * PAGE_SIZE;
  const visible = items.slice(start, start + PAGE_SIZE);

  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        {items.length > PAGE_SIZE && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs tabular-nums text-[var(--text-tertiary)]">
              {tCommon("pageRange", { start: start + 1, end: Math.min(start + PAGE_SIZE, items.length), total: items.length })}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={clampedPage === 0}
              aria-label={tCommon("previous")}
              className="rounded-full p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={clampedPage >= pageCount - 1}
              aria-label={tCommon("next")}
              className="rounded-full p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-2 py-4 text-sm text-[var(--text-tertiary)]">{tCommon("nothingHereYet")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 md:grid-cols-5">
          {visible.map((item, i) => {
            const href =
              linkType === "track"
                ? trackHref(item)
                : linkType === "artist"
                  ? artistHref(item)
                  : linkType === "album"
                    ? albumHref(item)
                    : null;
            // name+subtitle isn't actually unique — the same title/artist can appear more than
            // once (a track released on multiple albums gets a distinct Spotify id per
            // release), so fold in the item's position too, which is always unique per render.
            const key = `${start + i}-${item.trackUri ?? item.name}`;

            const content = (
              <>
                <div
                  className={`mb-2 aspect-square w-full overflow-hidden bg-[var(--hover)] transition-transform ${href ? "group-hover:scale-[1.03]" : ""} ${imageClass}`}
                >
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div
                  className={`truncate text-sm font-semibold text-[var(--text-primary)] ${href ? "group-hover:text-[var(--accent)]" : ""}`}
                >
                  {start + i + 1}. {item.name}
                </div>
                <div className="truncate text-xs text-[var(--text-tertiary)]">
                  {(() => {
                    const minutesText = tCommon("units.minutes", { count: Math.round(item.minutes) });
                    const playsText = tCommon("units.plays", { count: item.plays });
                    const primary = metric === "minutes" ? minutesText : playsText;
                    const secondary = metric === "minutes" ? playsText : minutesText;
                    return `${primary} · ${secondary}${item.subtitle ? ` · ${item.subtitle}` : ""}`;
                  })()}
                </div>
              </>
            );

            return href ? (
              <Link key={key} href={href} className="group block min-w-0">
                {content}
              </Link>
            ) : (
              <div key={key} className="min-w-0">
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
