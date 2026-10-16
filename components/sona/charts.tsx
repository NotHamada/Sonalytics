"use client";

import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/cn";
import { EmptyState, GlassCard } from "./primitives";

export function ChartCard({
  title,
  subtitle,
  ariaLabel,
  loading,
  emptyMessage,
  action,
  children,
  className,
  height = 240,
}: {
  title: string;
  subtitle?: string;
  ariaLabel: string;
  loading?: boolean;
  /** When set, the chart body is replaced by this message instead of rendering `children`. */
  emptyMessage?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  height?: number;
}) {
  return (
    <GlassCard as="section" className={cn("flex min-w-0 flex-col gap-4", className)} aria-label={title}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-text-tertiary">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div role="img" aria-label={ariaLabel} style={{ height }} className="min-w-0">
        {loading ? (
          <div className="skeleton h-full w-full rounded-2xl" />
        ) : emptyMessage ? (
          <EmptyState title={emptyMessage} />
        ) : (
          children
        )}
      </div>
    </GlassCard>
  );
}

interface TooltipPayloadItem {
  dataKey?: string | number;
  value?: number | string;
  color?: string;
}

function GlassTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs">
      <p className="mb-1 text-text-tertiary">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="font-mono font-semibold text-text-primary">
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {Number(p.value).toLocaleString()} {unit}
        </p>
      ))}
    </div>
  );
}

const axis = { fontSize: 11 };

export type BarSeries = { key: string; color?: "accent" | "violet" };

/** Rounded vertical bars on a dashed grid — the one chart style every page shares. Colors are CSS
 *  variables, so the light/dark toggle restyles charts instantly with no JS. */
export function BarSeriesChart({
  data,
  xKey = "label",
  series,
  unit,
  xInterval,
}: {
  data: readonly object[];
  xKey?: string;
  series: BarSeries[];
  unit?: string;
  xInterval?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="18%">
        <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey={xKey} tick={axis} axisLine={false} tickLine={false} interval={xInterval ?? "preserveStartEnd"} minTickGap={16} />
        <YAxis tick={axis} axisLine={false} tickLine={false} width={48} allowDecimals={false} />
        <Tooltip cursor={{ fill: "var(--accent-soft)" }} content={<GlassTooltip unit={unit} />} />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            fill={s.color === "violet" ? "var(--violet)" : "var(--accent)"}
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BarList({
  items,
  unit = "",
  tone = "green",
  labelWidth = "7rem",
}: {
  items: { label: string; value: number }[];
  unit?: string;
  tone?: "green" | "violet";
  labelWidth?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="flex flex-col gap-3">
      {items.map((i) => (
        <li key={i.label} className="grid items-center gap-3 text-sm" style={{ gridTemplateColumns: `${labelWidth} minmax(0,1fr) 3rem` }}>
          <span className="truncate capitalize text-text-secondary">{i.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-glass-strong">
            <span className={cn("block h-full rounded-full", tone === "green" ? "bg-brand" : "bg-violet")} style={{ width: `${(i.value / max) * 100}%` }} />
          </span>
          <span className="text-right font-mono text-xs text-text-tertiary">
            {i.value}
            {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Heatmap({
  rows,
  rowLabels,
  ariaLabel,
  cellTitle,
  lessLabel,
  moreLabel,
}: {
  rows: number[][];
  rowLabels: string[];
  ariaLabel: string;
  /** Builds the hover/aria text for one cell. */
  cellTitle: (rowLabel: string, hour: number, minutes: number) => string;
  lessLabel: string;
  moreLabel: string;
}) {
  const max = Math.max(1, ...rows.flat());
  return (
    <div className="flex flex-col gap-4">
      <div className="no-scrollbar overflow-x-auto">
        <div role="table" aria-label={ariaLabel} className="grid min-w-[560px] gap-[3px]" style={{ gridTemplateColumns: "2.5rem repeat(24, minmax(0, 1fr))" }}>
          <div role="row" className="contents">
            <span />
            {(rows[0] ?? []).map((_, h) => (
              <span key={h} role="columnheader" className="text-center font-mono text-[10px] text-text-tertiary">
                {h % 3 === 0 ? String(h).padStart(2, "0") : <span className="sr-only">{h}</span>}
              </span>
            ))}
          </div>
          {rows.map((row, d) => (
            <div role="row" key={rowLabels[d]} className="contents">
              <span role="rowheader" className="self-center text-xs text-text-tertiary">
                {rowLabels[d]}
              </span>
              {row.map((v, h) => (
                <span
                  key={h}
                  role="cell"
                  title={cellTitle(rowLabels[d] ?? "", h, v)}
                  aria-label={cellTitle(rowLabels[d] ?? "", h, v)}
                  className="h-6 rounded-[5px]"
                  style={{ background: v === 0 ? "var(--heat-0)" : `color-mix(in oklab, var(--accent) ${Math.round(12 + (v / max) * 88)}%, transparent)` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 text-xs text-text-tertiary" aria-hidden="true">
        {lessLabel}
        {[0, 25, 50, 75, 100].map((p) => (
          <span key={p} className="h-3 w-3 rounded-[4px]" style={{ background: p === 0 ? "var(--heat-0)" : `color-mix(in oklab, var(--accent) ${p}%, transparent)` }} />
        ))}
        {moreLabel}
      </div>
    </div>
  );
}
