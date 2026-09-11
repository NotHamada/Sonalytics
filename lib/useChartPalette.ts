"use client";

import { useEffect, useState } from "react";

export interface ChartPalette {
  accent: string;
  grid: string;
  text: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipLabel: string;
  cursor: string;
}

const LIGHT: ChartPalette = {
  accent: "#189b48",
  grid: "rgba(23,23,42,0.12)",
  text: "#6b6b85",
  tooltipBg: "rgba(255,255,255,0.9)",
  tooltipBorder: "rgba(255,255,255,0.7)",
  tooltipLabel: "#17172a",
  cursor: "rgba(23,23,42,0.06)",
};

const DARK: ChartPalette = {
  accent: "#1ed760",
  grid: "rgba(255,255,255,0.09)",
  text: "#8b8bab",
  tooltipBg: "rgba(26,26,44,0.9)",
  tooltipBorder: "rgba(255,255,255,0.09)",
  tooltipLabel: "#f2f2f9",
  cursor: "rgba(255,255,255,0.06)",
};

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Chart colors that follow the OS/browser color-scheme preference (recharts needs literal values, not CSS vars). */
export function useChartPalette(): ChartPalette {
  const [isDark, setIsDark] = useState(prefersDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isDark ? DARK : LIGHT;
}
