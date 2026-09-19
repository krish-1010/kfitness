"use client";

import { DateProvider } from "./_lib/DateContext";
import { ThemeProvider } from "./_lib/ThemeContext";
import { AppHeader } from "./_components/AppHeader";
import { AppNav } from "./_components/AppNav";

// Shared shell for every authenticated page (Workout/Food/Supplements/
// Weight/Water/Dashboard/Profile) — mounts once and stays alive across
// client-side navigation between them, so DateProvider's/ThemeProvider's
// state (the things genuinely shared across sections) persists without
// per-page plumbing. /login lives outside this route group entirely and
// never renders any of this.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DateProvider>
        <AppNav />
        <div className="app-content">
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <AppHeader />
            {children}
          </div>
        </div>
      </DateProvider>
    </ThemeProvider>
  );
}
