"use client";

export type RangePreset = "all" | "today" | "week" | "month" | "year" | "custom";

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "custom", label: "Custom" },
];

export function computeRangeBounds(
  preset: RangePreset,
  customStart: string,
  customEnd: string
): { start?: string; end?: string } {
  const now = new Date();

  switch (preset) {
    case "all":
      return {};
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start: start.toISOString(), end: now.toISOString() };
    }
    case "week":
      return { start: new Date(now.getTime() - 7 * 86_400_000).toISOString(), end: now.toISOString() };
    case "month":
      return { start: new Date(now.getTime() - 30 * 86_400_000).toISOString(), end: now.toISOString() };
    case "year":
      return { start: new Date(now.getTime() - 365 * 86_400_000).toISOString(), end: now.toISOString() };
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
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-1 rounded-full border border-neutral-800 bg-neutral-900 p-1 text-sm">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPresetChange(p.value)}
            className={`rounded-full px-3 py-1.5 transition-colors ${
              preset === p.value
                ? "bg-[#1DB954] font-semibold text-black"
                : "text-neutral-400 hover:text-neutral-100"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomChange(e.target.value, customEnd)}
            className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-neutral-100"
          />
          <span>to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomChange(customStart, e.target.value)}
            className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-neutral-100"
          />
        </div>
      )}
    </div>
  );
}
