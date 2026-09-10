"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HistogramBucket } from "@/lib/types";

export default function HistogramChart({
  title,
  data,
  barName,
  emptyMessage,
}: {
  title: string;
  data: HistogramBucket[];
  barName: string;
  emptyMessage: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="mb-4 text-lg font-semibold text-neutral-100">{title}</h2>
      {data.length === 0 ? (
        <p className="text-sm text-neutral-500">{emptyMessage}</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ left: -20, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
            <XAxis dataKey="label" stroke="#737373" fontSize={12} />
            <YAxis stroke="#737373" fontSize={12} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#171717", border: "1px solid #262626", borderRadius: 8 }}
              labelStyle={{ color: "#e5e5e5" }}
              itemStyle={{ color: "#1DB954" }}
              cursor={{ fill: "#262626" }}
            />
            <Bar dataKey="count" fill="#1DB954" radius={[4, 4, 0, 0]} name={barName} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
