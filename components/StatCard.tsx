import InfoTooltip from "./InfoTooltip";

export default function StatCard({
  label,
  value,
  hint,
  formula,
}: {
  label: string;
  value: string;
  hint?: string;
  formula?: string;
}) {
  return (
    <div className="glass-card px-5 py-4">
      <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
      <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
        {label}
        {formula && <InfoTooltip text={formula} />}
      </div>
      {hint && <div className="mt-1 text-xs text-[var(--text-tertiary)]">{hint}</div>}
    </div>
  );
}
