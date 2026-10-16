"use client";

import { useSyncExternalStore } from "react";

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
  text: "#6e6e88",
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

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", onChange);
  // The header's theme toggle flips <html data-theme> — watch it so charts follow immediately.
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    mq.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

function getSnapshot(): boolean {
  const theme = document.documentElement.dataset.theme;
  return theme ? theme === "dark" : window.matchMedia(DARK_QUERY).matches;
}

/** Chart colors that follow the active theme — the explicit light/dark toggle when set, otherwise
 *  the OS/browser preference (recharts needs literal values, not CSS vars). */
export function useChartPalette(): ChartPalette {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, () => false);
  return isDark ? DARK : LIGHT;
}
