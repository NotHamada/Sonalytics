"use client";

import type { HourPoint } from "@/lib/historyAnalytics";
import InfoTooltip from "./InfoTooltip";

const PARTS = [
  { label: "Night", range: "12a–6a", start: 0, end: 6 },
  { label: "Morning", range: "6a–12p", start: 6, end: 12 },
  { label: "Afternoon", range: "12p–6p", start: 12, end: 18 },
  { label: "Evening", range: "6p–12a", start: 18, end: 24 },
];

export default function DayPartBreakdown({ data }: { data: HourPoint[] }) {
  const totalMinutes = data.reduce((sum, h) => sum + h.minutes, 0);

  const parts = PARTS.map((part) => {
    const minutes = data
      .filter((h) => h.hour >= part.start && h.hour < part.end)
      .reduce((sum, h) => sum + h.minutes, 0);
    const percent = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0;
    return { ...part, minutes, percent };
  });

  return (
    <div className="glass-card p-5">
      <h2 className="mb-1 flex items-center gap-1.5 text-lg font-semibold text-[var(--text-primary)]">
        Day Part Breakdown
        <InfoTooltip text="percent = (minutes played in that part of day ÷ total minutes) × 100, where each hour-of-day bucket is assigned to Night (12a–6a), Morning (6a–12p), Afternoon (12p–6p), or Evening (6p–12a)." />
      </h2>
      <p className="mb-4 text-xs text-[var(--text-tertiary)]">Share of listening time across the day.</p>

      {totalMinutes === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">Not enough data yet.</p>
      ) : (
        <div className="space-y-3">
          {parts.map((part) => (
            <div key={part.label}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="font-medium text-[var(--text-primary)]">
                  {part.label} <span className="text-[var(--text-tertiary)]">{part.range}</span>
                </span>
                <span className="tabular-nums text-[var(--text-tertiary)]">{Math.round(part.percent)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--hover)]">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${part.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
