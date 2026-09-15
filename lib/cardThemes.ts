export interface CardTheme {
  id: string;
  label: string;
  /** Representative color shown as the picker swatch. */
  swatch: string;
  panelBg: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  heroGradient: string;
}

export const CARD_THEMES: CardTheme[] = [
  {
    id: "midnight",
    label: "Midnight",
    swatch: "#1ed760",
    panelBg: "#0b0b12",
    textPrimary: "#f2f2f9",
    textSecondary: "#aeaec8",
    textTertiary: "#71718f",
    accent: "#1ed760",
    heroGradient: "linear-gradient(160deg, #2a0f45 0%, #0a0a14 60%, #07231a 100%)",
  },
  {
    id: "sunset",
    label: "Sunset",
    swatch: "#ff7a45",
    panelBg: "#1c0f0a",
    textPrimary: "#fff4ec",
    textSecondary: "#e8b9a0",
    textTertiary: "#a97a63",
    accent: "#ff7a45",
    heroGradient: "linear-gradient(160deg, #ff7a45 0%, #d1274f 55%, #1c0f0a 100%)",
  },
  {
    id: "paper",
    label: "Paper",
    swatch: "#a9c8ff",
    // Reuses the app's own light-theme palette from globals.css, so this style feels like a
    // real second brand mode rather than an arbitrary extra color.
    panelBg: "#f3f1fb",
    textPrimary: "#17172a",
    textSecondary: "#52526b",
    textTertiary: "#85859e",
    accent: "#189b48",
    heroGradient: "linear-gradient(160deg, #ffb3d1 0%, #a9c8ff 50%, #b7f5c9 100%)",
  },
];

export const DEFAULT_CARD_THEME = "midnight";

export function resolveCardTheme(id: string | null | undefined): CardTheme {
  return CARD_THEMES.find((t) => t.id === id) ?? CARD_THEMES.find((t) => t.id === DEFAULT_CARD_THEME)!;
}
