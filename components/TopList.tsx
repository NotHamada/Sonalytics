"use client";

import { useState } from "react";
import type { TimeRange, TopEntryDTO } from "@/lib/types";

const RANGE_LABELS: Record<TimeRange, string> = {
  short_term: "Last 4 weeks",
  medium_term: "Last 6 months",
  long_term: "All time",
};

const RANGES: TimeRange[] = ["short_term", "medium_term", "long_term"];

export default function TopList({
  title,
  entries,
}: {
  title: string;
  entries: Record<TimeRange, TopEntryDTO[]>;
}) {
  const [range, setRange] = useState<TimeRange>("medium_term");

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-100">{title}</h2>
        <div className="flex gap-1 rounded-full bg-neutral-800 p-1 text-xs">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 transition-colors ${
                range === r ? "bg-[#1DB954] text-black font-semibold" : "text-neutral-400"
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <ol className="space-y-2">
        {entries[range].slice(0, 10).map((entry, i) => (
          <li key={entry.id}>
            <a
              href={entry.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-neutral-800 transition-colors"
            >
              <span className="w-5 text-sm text-neutral-500 tabular-nums">{i + 1}</span>
              {entry.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.image} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className="h-10 w-10 rounded bg-neutral-800" />
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-neutral-100">{entry.name}</div>
                {entry.subtitle && (
                  <div className="truncate text-xs text-neutral-500">{entry.subtitle}</div>
                )}
              </div>
            </a>
          </li>
        ))}
        {entries[range].length === 0 && (
          <li className="text-sm text-neutral-500 px-2 py-4">Not enough listening history yet.</li>
        )}
      </ol>
    </div>
  );
}
