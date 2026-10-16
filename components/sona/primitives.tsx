import type { ButtonHTMLAttributes, ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function GlassCard({
  children,
  className,
  strong,
  as: Tag = "div",
  ...rest
}: { children?: ReactNode; className?: string; strong?: boolean; as?: ElementType } & HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn(strong ? "glass-strong" : "glass", "rounded-card p-5 sm:p-6", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function SectionHeader({
  title,
  subtitle,
  eyebrow,
  action,
  level = 2,
  id,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: ReactNode;
  level?: 1 | 2 | 3;
  id?: string;
}) {
  const H = `h${level}` as "h1";
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 font-mono text-xs uppercase tracking-[0.14em] text-brand">{eyebrow}</p>}
        <H
          id={id}
          className={cn(
            level === 1 ? "text-title" : level === 2 ? "text-xl font-semibold tracking-tight sm:text-2xl" : "text-base font-semibold",
          )}
        >
          {title}
        </H>
        {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

const badgeTones = {
  green: "bg-brand-soft text-brand",
  violet: "bg-violet-soft text-violet",
  neutral: "bg-glass-strong text-text-secondary border border-glass-border",
  warn: "bg-warn-soft text-warn",
} as const;
export type BadgeTone = keyof typeof badgeTones;

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", badgeTones[tone], className)}>
      {children}
    </span>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-divider p-6 text-center">
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      {hint && <p className="text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}

export function ProgressBar({ value, label, tone = "green" }: { value: number; label: string; tone?: "green" | "violet" }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-glass-strong"
    >
      <div className={cn("h-full rounded-full", tone === "green" ? "bg-brand" : "bg-violet")} style={{ width: `${value}%` }} />
    </div>
  );
}

export function ThemeSwatch({
  name,
  background,
  selected,
  onSelect,
}: {
  name: string;
  background: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl p-2 text-xs transition-colors",
        selected ? "bg-brand-soft text-text-primary" : "text-text-secondary hover:bg-glass-strong",
      )}
    >
      <span className={cn("h-12 w-12 rounded-xl border-2", selected ? "border-brand" : "border-glass-border")} style={{ background }} />
      {name}
    </button>
  );
}

export type PillVariant = "primary" | "secondary" | "ghost";

/** Class list for pill buttons — exported so links (`<a>`, next-intl `<Link>`) can look identical to `<PillButton>`. */
export function pillClass(variant: PillVariant = "primary", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50",
    variant === "primary" && "cta-glow",
    variant === "secondary" && "glass-strong text-text-primary hover:bg-glass",
    variant === "ghost" && "text-text-secondary hover:text-text-primary",
    className,
  );
}

export function PillButton({
  children,
  variant = "primary",
  className,
  ...rest
}: { children: ReactNode; variant?: PillVariant; className?: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={pillClass(variant, className)} {...rest}>
      {children}
    </button>
  );
}

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

/** Stable two-tone gradient per name, used when Spotify has no image for an item. */
export function gradientFor(seed: string): string {
  const h = hashSeed(seed) % 360;
  return `linear-gradient(135deg, hsl(${h} 65% 52%), hsl(${(h + 70) % 360} 60% 36%))`;
}

export function Artwork({
  src,
  label,
  shape = "square",
  radius = "rounded-2xl",
  className,
}: {
  src?: string | null;
  label: string;
  shape?: "square" | "circle";
  radius?: string;
  className?: string;
}) {
  const classes = cn("aspect-square w-full shrink-0 border border-glass-border", shape === "circle" ? "rounded-full" : radius, className);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn(classes, "object-cover")} />;
  }
  return <div role="img" aria-label={label} className={classes} style={{ background: gradientFor(label) }} />;
}

/** Shared page body wrapper — every page's content sits in the same width/rhythm. */
export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="fade-up mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      {children}
    </main>
  );
}
