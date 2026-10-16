import InfoTooltip from "./InfoTooltip";

export default function StatCard({
  label,
  value,
  hint,
  formula,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  formula?: string;
  accent?: boolean;
}) {
  return (
    <div className="glass-card flex min-w-0 flex-col gap-2 px-4 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-2 text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
        {label}
        {formula && <InfoTooltip text={formula} />}
      </div>
      <div
        className={`break-words font-mono text-2xl font-semibold leading-tight tracking-tight ${
          accent ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-[var(--text-secondary)]">{hint}</div>}
    </div>
  );
}
