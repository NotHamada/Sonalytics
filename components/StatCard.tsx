export default function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="glass-card px-5 py-4">
      <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
      <div className="text-sm text-[var(--text-secondary)]">{label}</div>
      {hint && <div className="mt-1 text-xs text-[var(--text-tertiary)]">{hint}</div>}
    </div>
  );
}
