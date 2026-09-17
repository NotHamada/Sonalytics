import type { CohortBreakdown } from "@/lib/types";
import InfoTooltip from "./InfoTooltip";

function Column({ title, hint, entries }: { title: string; hint: string; entries: CohortBreakdown["core"] }) {
  return (
    <div>
      <div className="mb-2">
        <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
        <div className="text-xs text-[var(--text-tertiary)]">{hint}</div>
      </div>
      <ul className="space-y-1.5">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={entry.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-[var(--hover)]"
            >
              {entry.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.image} alt="" className="h-8 w-8 rounded-md object-cover shrink-0" />
              ) : (
                <div className="h-8 w-8 rounded-md bg-[var(--hover)] shrink-0" />
              )}
              <span className="truncate text-sm text-[var(--text-primary)]">{entry.name}</span>
            </a>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="px-1.5 py-2 text-xs text-[var(--text-tertiary)]">None yet.</li>
        )}
      </ul>
    </div>
  );
}

export default function CohortBoard({ title, cohorts }: { title: string; cohorts: CohortBreakdown }) {
  return (
    <div className="glass-card p-5">
      <h2 className="mb-1 flex items-center gap-1.5 text-lg font-semibold text-[var(--text-primary)]">
        {title}
        <InfoTooltip text="Classified by presence across Spotify's short-term (~4 weeks), medium-term (~6 months), and long-term (years) top-item windows: Core = in all three, New Discoveries = only in the short-term window, Fading Out = in medium/long-term but has dropped out of short-term." />
      </h2>
      <p className="mb-4 text-xs text-[var(--text-tertiary)]">
        Comparing your last-4-weeks, 6-month, and all-time top lists.
      </p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Column title="Core" hint="In every window — your enduring taste" entries={cohorts.core} />
        <Column title="New Discoveries" hint="Only in the last 4 weeks" entries={cohorts.discoveries} />
        <Column title="Fading Out" hint="Was a favorite, less so lately" entries={cohorts.fading} />
      </div>
    </div>
  );
}
