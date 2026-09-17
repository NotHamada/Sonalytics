"use client";

import type { HeatmapCell } from "@/lib/historyAnalytics";
import InfoTooltip from "./InfoTooltip";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => {
  const period = h < 12 ? "a" : "p";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${period}`;
});

export default function TimeOfDayHeatmap({ data }: { data: HeatmapCell[] }) {
  const max = Math.max(1, ...data.map((c) => c.minutes));
  const grid = new Map(data.map((c) => [`${c.day}-${c.hour}`, c.minutes]));

  const cells: React.ReactNode[] = [];
  cells.push(<div key="corner" />);
  HOUR_LABELS.forEach((label, h) => {
    cells.push(
      <div key={`hlabel-${h}`} className="text-center text-[9px] text-[var(--text-tertiary)]">
        {h % 3 === 0 ? label : ""}
      </div>
    );
  });
  WEEKDAY_LABELS.forEach((label, day) => {
    cells.push(
      <div key={`wlabel-${day}`} className="pr-2 text-xs text-[var(--text-tertiary)]">
        {label}
      </div>
    );
    HOUR_LABELS.forEach((_, hour) => {
      const minutes = grid.get(`${day}-${hour}`) ?? 0;
      cells.push(
        <div
          key={`${day}-${hour}`}
          title={`${label} ${HOUR_LABELS[hour]} — ${minutes} min`}
          className="h-[14px] w-[14px] rounded-[2px]"
          style={{
            background: minutes === 0 ? "var(--divider)" : "var(--accent)",
            opacity: minutes === 0 ? 1 : 0.2 + 0.8 * (minutes / max),
          }}
        />
      );
    });
  });

  return (
    <div className="glass-card p-5">
      <h2 className="mb-1 flex items-center gap-1.5 text-lg font-semibold text-[var(--text-primary)]">
        Listening by Hour &amp; Day
        <InfoTooltip text="Each cell sums total minutes played in that hour/weekday slot. Opacity = 0.2 + 0.8 × (cell minutes ÷ busiest cell's minutes), so the busiest slot is fully opaque and empty slots fall back to the divider color." />
      </h2>
      <p className="mb-4 text-xs text-[var(--text-tertiary)]">
        When during the week you listen most — lighter means more minutes.
      </p>

      {data.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">Not enough data yet.</p>
      ) : (
        <div className="overflow-x-auto pb-1">
          <div
            className="inline-grid items-center gap-[3px]"
            style={{ gridTemplateColumns: `auto repeat(24, 14px)` }}
          >
            {cells}
          </div>
        </div>
      )}
    </div>
  );
}
