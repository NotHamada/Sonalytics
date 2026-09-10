"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GenreCount } from "@/lib/types";

export default function GenreChart({ data }: { data: GenreCount[] }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="mb-4 text-lg font-semibold text-neutral-100">Genre Breakdown</h2>
      {data.length === 0 ? (
        <p className="text-sm text-neutral-500">Not enough data to determine genres yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(220, data.length * 32)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
            <XAxis type="number" stroke="#737373" fontSize={12} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="genre"
              stroke="#737373"
              fontSize={12}
              width={140}
              tick={{ fill: "#a3a3a3" }}
            />
            <Tooltip
              contentStyle={{ background: "#171717", border: "1px solid #262626", borderRadius: 8 }}
              labelStyle={{ color: "#e5e5e5" }}
              itemStyle={{ color: "#1DB954" }}
              cursor={{ fill: "#262626" }}
            />
            <Bar dataKey="count" fill="#1DB954" radius={[0, 4, 4, 0]} name="Artists" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
