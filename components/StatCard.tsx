import { cn } from "@/lib/cn";
import InfoTooltip from "./InfoTooltip";
import { GlassCard } from "./sona/primitives";

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
    <GlassCard className="flex min-w-0 flex-col gap-2 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-text-tertiary">{label}</p>
        {formula && <InfoTooltip text={formula} />}
      </div>
      <p className={cn("break-words font-mono text-2xl font-semibold leading-tight tracking-tight xl:text-[1.6rem]", accent && "text-brand")}>
        {value}
      </p>
      {hint && <p className="text-xs text-text-secondary">{hint}</p>}
    </GlassCard>
  );
}
