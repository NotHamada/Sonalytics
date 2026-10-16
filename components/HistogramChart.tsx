"use client";

import type { HistogramBucket } from "@/lib/types";
import InfoTooltip from "./InfoTooltip";
import { BarSeriesChart, ChartCard } from "./sona/charts";

export default function HistogramChart({
  title,
  subtitle,
  formula,
  data,
  barName,
  emptyMessage,
  color,
  height,
  xInterval,
}: {
  title: string;
  subtitle?: string;
  formula?: string;
  data: HistogramBucket[];
  barName: string;
  emptyMessage: string;
  color?: "accent" | "violet";
  height?: number;
  xInterval?: number;
}) {
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      ariaLabel={`${title} — ${barName}`}
      emptyMessage={data.length === 0 ? emptyMessage : undefined}
      action={formula ? <InfoTooltip text={formula} /> : undefined}
      height={height}
    >
      <BarSeriesChart data={data} series={[{ key: "count", color }]} unit={barName} xInterval={xInterval} />
    </ChartCard>
  );
}
