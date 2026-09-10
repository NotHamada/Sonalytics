import type { CohortBreakdown } from "@/lib/types";

function Column({ title, hint, entries }: { title: string; hint: string; entries: CohortBreakdown["core"] }) {
  return (
    <div>
      <div className="mb-2">
        <div className="text-sm font-semibold text-neutral-200">{title}</div>
        <div className="text-xs text-neutral-500">{hint}</div>
      </div>
      <ul className="space-y-1.5">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={entry.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-neutral-800 transition-colors"
            >
              {entry.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.image} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
              ) : (
                <div className="h-8 w-8 rounded bg-neutral-800 shrink-0" />
              )}
              <span className="truncate text-sm text-neutral-200">{entry.name}</span>
            </a>
          </li>
        ))}
        {entries.length === 0 && <li className="px-1.5 py-2 text-xs text-neutral-600">None yet.</li>}
      </ul>
    </div>
  );
}

export default function CohortBoard({ title, cohorts }: { title: string; cohorts: CohortBreakdown }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="mb-1 text-lg font-semibold text-neutral-100">{title}</h2>
      <p className="mb-4 text-xs text-neutral-500">
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
