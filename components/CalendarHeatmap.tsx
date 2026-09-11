"use client";

import { useMemo } from "react";
import type { CalendarDay } from "@/lib/historyAnalytics";

const MS_PER_DAY = 86_400_000;

export default function CalendarHeatmap({ data }: { data: CalendarDay[] }) {
  const { weeks, max } = useMemo(() => {
    if (data.length === 0) return { weeks: [] as (CalendarDay | null)[][], max: 1 };

    const map = new Map(data.map((d) => [d.date, d.minutes]));
    const start = new Date(`${data[0].date}T00:00:00`);
    const end = new Date(`${data[data.length - 1].date}T00:00:00`);

    // Back up to the preceding Sunday so every column is a full 7-day week.
    const gridStart = new Date(start);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    const days: (CalendarDay | null)[] = [];
    for (let t = gridStart.getTime(); t <= end.getTime(); t += MS_PER_DAY) {
      const d = new Date(t);
      const key = d.toISOString().slice(0, 10);
      days.push(d >= start ? { date: key, minutes: map.get(key) ?? 0 } : null);
    }

    const weeks: (CalendarDay | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return { weeks, max: Math.max(1, ...data.map((d) => d.minutes)) };
  }, [data]);

  return (
    <div className="glass-card p-5">
      <h2 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">Listening Calendar</h2>
      <p className="mb-4 text-xs text-[var(--text-tertiary)]">
        Every day you listened, from your imported history — darker means more minutes.
      </p>

      {weeks.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">No history imported yet.</p>
      ) : (
        <div className="overflow-x-auto pb-1">
          <div className="inline-grid grid-flow-col gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-rows-7 gap-[3px]">
                {week.map((day, di) =>
                  day === null ? (
                    <div key={di} className="h-[10px] w-[10px]" />
                  ) : (
                    <div
                      key={di}
                      title={`${day.date} — ${day.minutes} min`}
                      className="h-[10px] w-[10px] rounded-[2px]"
                      style={{
                        background: day.minutes === 0 ? "var(--divider)" : "var(--accent)",
                        opacity: day.minutes === 0 ? 1 : 0.25 + 0.75 * (day.minutes / max),
                      }}
                    />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
