"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import DateRangePicker, { formatDisplay, parseISODate } from "./DateRangePicker";

export type RangePreset = "today" | "week" | "fourWeeks" | "sixMonths" | "year" | "lifetime" | "custom";

export function computeRangeBounds(
  preset: RangePreset,
  customStart: string,
  customEnd: string
): { start?: string; end?: string } {
  const now = new Date();

  switch (preset) {
    case "lifetime":
      return {};
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start: start.toISOString(), end: now.toISOString() };
    }
    case "week":
      return { start: new Date(now.getTime() - 7 * 86_400_000).toISOString(), end: now.toISOString() };
    case "fourWeeks":
      return { start: new Date(now.getTime() - 28 * 86_400_000).toISOString(), end: now.toISOString() };
    case "sixMonths":
      return { start: new Date(now.getTime() - 182 * 86_400_000).toISOString(), end: now.toISOString() };
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: start.toISOString(), end: now.toISOString() };
    }
    case "custom":
      return {
        start: customStart ? new Date(customStart).toISOString() : undefined,
        end: customEnd ? new Date(`${customEnd}T23:59:59`).toISOString() : undefined,
      };
  }
}

export default function RangeSelector({
  preset,
  onPresetChange,
  customStart,
  customEnd,
  onCustomChange,
}: {
  preset: RangePreset;
  onPresetChange: (preset: RangePreset) => void;
  customStart: string;
  customEnd: string;
  onCustomChange: (start: string, end: string) => void;
}) {
  const t = useTranslations("common.rangeSelector");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [anchor, setAnchor] = useState<"left" | "right">("left");
  const containerRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const PRESETS: { value: RangePreset; label: string }[] = [
    { value: "today", label: t("today") },
    { value: "week", label: t("thisWeek") },
    { value: "fourWeeks", label: t("fourWeeks") },
    { value: "sixMonths", label: t("sixMonths") },
    { value: "year", label: String(currentYear) },
    { value: "lifetime", label: t("lifetime") },
    { value: "custom", label: t("custom") },
  ];

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Anchor to whichever side actually has room, rather than a fixed breakpoint — the trigger
  // can end up near either edge regardless of viewport size depending on where it sits in the page.
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const panelWidth = view === "calendar" ? 288 : 200;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceRight = document.documentElement.clientWidth - rect.left;
    setAnchor(spaceRight >= panelWidth + 16 ? "left" : "right");
  }, [open, view]);

  function toggleOpen() {
    setOpen((o) => {
      const next = !o;
      if (next) setView(preset === "custom" ? "calendar" : "list");
      return next;
    });
  }

  function handlePresetClick(value: RangePreset) {
    onPresetChange(value);
    if (value === "custom") {
      // Keep the panel open and switch straight to the calendar instead of closing.
      setView("calendar");
      return;
    }
    setOpen(false);
  }

  const customRangeStart = parseISODate(customStart);
  const customRangeEnd = parseISODate(customEnd);
  const triggerLabel =
    preset === "custom"
      ? customRangeStart && customRangeEnd
        ? `${formatDisplay(customRangeStart, locale)} – ${formatDisplay(customRangeEnd, locale)}`
        : t("custom")
      : (PRESETS.find((p) => p.value === preset)?.label ?? "");

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="glass-pill flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[var(--text-primary)]"
      >
        {triggerLabel}
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className={`glass-card absolute top-[calc(100%+8px)] z-20 max-w-[calc(100vw-2rem)] shadow-xl ${
            anchor === "left" ? "left-0" : "right-0"
          } ${view === "calendar" ? "w-72 p-4" : "min-w-[180px] p-1.5"}`}
        >
          {view === "list" ? (
            <ul>
              {PRESETS.map((p) => {
                const selected = preset === p.value;
                return (
                  <li key={p.value}>
                    <button
                      type="button"
                      onClick={() => handlePresetClick(p.value)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--hover)] ${
                        selected ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                      }`}
                    >
                      <span className="w-4 shrink-0 text-[var(--accent)]">{selected ? "✓" : ""}</span>
                      {p.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setView("list")}
                className="mb-2 flex items-center gap-1 text-xs text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {t("allRanges")}
              </button>
              <DateRangePicker
                startDate={customStart}
                endDate={customEnd}
                onChange={onCustomChange}
                onComplete={() => setOpen(false)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
