"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "dark" | "light";

// Fixed accent presets, not a free-form picker — contrast against both
// themes is checked once per preset (see globals.css's light/dark blocks
// for the values these labels ultimately drive) rather than needing a
// live check for an arbitrary user-chosen color.
export const ACCENT_PRESETS = [
  { id: "amber", label: "Amber", swatch: "#D4922C" },
  { id: "blue", label: "Blue", swatch: "#6B9BC1" },
  { id: "green", label: "Green", swatch: "#7FA66B" },
  { id: "purple", label: "Purple", swatch: "#A67FB5" },
  { id: "red", label: "Red", swatch: "#C1604B" },
] as const;
export type AccentId = (typeof ACCENT_PRESETS)[number]["id"];

// Per-accent, per-theme --primary/--primary-foreground pairs. "amber" is
// the default and matches the values already baked into globals.css's
// :root/.dark blocks, so picking it back is a true no-op.
const ACCENT_VALUES: Record<AccentId, { dark: { primary: string; primaryForeground: string }; light: { primary: string; primaryForeground: string } }> = {
  amber: { dark: { primary: "#D4922C", primaryForeground: "#15140F" }, light: { primary: "#B5741E", primaryForeground: "#FFFFFF" } },
  blue: { dark: { primary: "#6B9BC1", primaryForeground: "#15140F" }, light: { primary: "#3D6A8A", primaryForeground: "#FFFFFF" } },
  green: { dark: { primary: "#7FA66B", primaryForeground: "#15140F" }, light: { primary: "#4F7A3D", primaryForeground: "#FFFFFF" } },
  purple: { dark: { primary: "#A67FB5", primaryForeground: "#15140F" }, light: { primary: "#6E4F7D", primaryForeground: "#FFFFFF" } },
  red: { dark: { primary: "#C1604B", primaryForeground: "#15140F" }, light: { primary: "#A83E28", primaryForeground: "#FFFFFF" } },
};

function applyAccent(accent: AccentId, theme: ThemeMode) {
  const values = ACCENT_VALUES[accent][theme];
  document.documentElement.style.setProperty("--primary", values.primary);
  document.documentElement.style.setProperty("--primary-foreground", values.primaryForeground);
}

function applyThemeClass(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

type ThemeContextValue = {
  theme: ThemeMode;
  accent: AccentId;
  setTheme: (t: ThemeMode) => void;
  setAccent: (a: AccentId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Mounted once by (app)/layout.tsx. Reads the user's saved theme/accent
// from the existing per-user `settings` table (the same mechanism already
// proven for water_target_ml) rather than localStorage — this app has no
// existing localStorage usage, and settings synced server-side match the
// real use case (same account on phone + laptop) better than a per-device
// preference would. Defaults to dark/amber — today's only look — so
// nothing visually changes until a user actively opts in.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [accent, setAccentState] = useState<AccentId>("amber");

  useEffect(() => {
    Promise.all([
      fetch("/api/settings?key=theme").then((r) => r.json()),
      fetch("/api/settings?key=accent_color").then((r) => r.json()),
    ]).then(([themeData, accentData]) => {
      const loadedTheme: ThemeMode = themeData.value === "light" ? "light" : "dark";
      const loadedAccent: AccentId = ACCENT_PRESETS.some((p) => p.id === accentData.value) ? accentData.value : "amber";
      setThemeState(loadedTheme);
      setAccentState(loadedAccent);
      applyThemeClass(loadedTheme);
      applyAccent(loadedAccent, loadedTheme);
    });
  }, []);

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    applyThemeClass(t);
    applyAccent(accent, t);
    document.cookie = `theme=${t}; path=/; max-age=31536000; samesite=lax`;
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "theme", value: t }),
    });
  };

  const setAccent = (a: AccentId) => {
    setAccentState(a);
    applyAccent(a, theme);
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "accent_color", value: a }),
    });
  };

  return <ThemeContext.Provider value={{ theme, accent, setTheme, setAccent }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
