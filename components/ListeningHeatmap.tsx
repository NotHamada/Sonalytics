"use client";

import { useMemo } from "react";
import type { RecentlyPlayedItem } from "@/lib/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ListeningHeatmap({ items }: { items: RecentlyPlayedItem[] }) {
  const { grid, max } = useMemo(() => {
    const g = Array.from({ length: 7 }, () => new Array(24).fill(0) as number[]);
    for (const item of items) {
      const d = new Date(item.playedAt);
      g[d.getDay()][d.getHours()] += 1;
    }
    const m = Math.max(1, ...g.flat());
    return { grid: g, max: m };
  }, [items]);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="mb-1 text-lg font-semibold text-neutral-100">Listening Activity</h2>
      <p className="mb-4 text-xs text-neutral-500">
        When your last {items.length} plays happened, by day and hour (your local time).
      </p>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">No recent playback history yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-grid gap-[3px]" style={{ gridTemplateColumns: `32px repeat(24, minmax(14px, 1fr))` }}>
            <div />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="text-center text-[9px] text-neutral-600">
                {h % 6 === 0 ? h : ""}
              </div>
            ))}
            {grid.map((row, day) => (
              <div key={day} className="contents">
                <div className="flex items-center text-[10px] text-neutral-500">{DAY_LABELS[day]}</div>
                {row.map((count, hour) => (
                  <div
                    key={hour}
                    title={`${DAY_LABELS[day]} ${hour}:00 — ${count} play${count === 1 ? "" : "s"}`}
                    className="aspect-square rounded-sm"
                    style={{
                      background: count === 0 ? "#262626" : "#1DB954",
                      opacity: count === 0 ? 1 : 0.25 + 0.75 * (count / max),
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
