"use client";

import { useState } from "react";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatDisplay(d: Date): string {
  return `${MONTH_LABELS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}

function buildMonthGrid(viewMonth: Date): (Date | null)[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const startOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

// Spotify predates 2008; going back to 2005 comfortably covers any real account.
const EARLIEST_YEAR = 2005;

/** Headless calendar body — no trigger button or open/close state of its own. The parent
 *  (RangeSelector) owns the dropdown panel and decides when this is visible. */
export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  onComplete,
}: {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  /** Called once a full start+end range has been picked, so the parent can close its panel. */
  onComplete?: () => void;
}) {
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  const [viewMonth, setViewMonth] = useState(() => start ?? new Date());
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - EARLIEST_YEAR + 1 }, (_, i) => currentYear - i);

  function handleDayClick(day: Date) {
    // A click with no pending start, or right after a completed range, begins a new selection.
    if (!pendingStart || (start && end)) {
      setPendingStart(day);
      onChange(toISODate(day), "");
      return;
    }

    if (day < pendingStart) {
      onChange(toISODate(day), toISODate(pendingStart));
    } else {
      onChange(toISODate(pendingStart), toISODate(day));
    }
    setPendingStart(null);
    onComplete?.();
  }

  const grid = buildMonthGrid(viewMonth);
  const rangeStart = pendingStart ?? start;
  const rangeEnd = pendingStart ? hoverDate : end;

  function inRange(day: Date): boolean {
    if (!rangeStart || !rangeEnd) return false;
    const lo = rangeStart < rangeEnd ? rangeStart : rangeEnd;
    const hi = rangeStart < rangeEnd ? rangeEnd : rangeStart;
    return day > lo && day < hi;
  }

  function isEdge(day: Date): boolean {
    return Boolean((rangeStart && sameDay(day, rangeStart)) || (rangeEnd && sameDay(day, rangeEnd)));
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          className="shrink-0 rounded-full p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
          aria-label="Previous month"
        >
          ‹
        </button>

        <div className="flex min-w-0 items-center gap-1">
          <select
            value={viewMonth.getMonth()}
            onChange={(e) => setViewMonth(new Date(viewMonth.getFullYear(), Number(e.target.value), 1))}
            aria-label="Month"
            className="min-w-0 rounded-md bg-transparent px-1 py-0.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--hover)] focus:outline-none"
          >
            {MONTH_LABELS.map((m, i) => (
              <option key={m} value={i} style={{ color: "#17172a", backgroundColor: "#ffffff" }}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={viewMonth.getFullYear()}
            onChange={(e) => setViewMonth(new Date(Number(e.target.value), viewMonth.getMonth(), 1))}
            aria-label="Year"
            className="min-w-0 rounded-md bg-transparent px-1 py-0.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--hover)] focus:outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y} style={{ color: "#17172a", backgroundColor: "#ffffff" }}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          className="shrink-0 rounded-full p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-xs text-[var(--text-tertiary)]">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i} className="py-1">
            {w}
          </div>
        ))}
        {grid.map((day, i) => {
          if (!day) return <div key={i} />;
          const edge = isEdge(day);
          const within = inRange(day);
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => setHoverDate(day)}
              aria-label={formatDisplay(day)}
              className={`aspect-square rounded-full text-sm transition-colors ${
                edge
                  ? "bg-[var(--accent)] font-semibold text-white"
                  : within
                    ? "bg-[var(--accent-soft)] text-[var(--text-primary)]"
                    : "text-[var(--text-primary)] hover:bg-[var(--hover)]"
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-[var(--text-tertiary)]">
        {pendingStart && !end ? "Pick an end date" : "Pick a start date"}
      </p>
    </div>
  );
}
