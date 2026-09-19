"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { TODAY } from "@/lib/date";

type DateContextValue = { date: string; setDate: (d: string) => void };

const DateContext = createContext<DateContextValue | null>(null);

// Mounted once by (app)/layout.tsx, which stays alive across client-side
// navigation between its child pages — so the selected date survives
// Workout -> Food -> Weight -> back to Workout with no per-page plumbing.
// Resets to today on a hard reload/relaunch, which is the intended
// behavior (this is "shared during a session", not a persisted preference).
export function DateProvider({ children }: { children: ReactNode }) {
  const [date, setDate] = useState(TODAY());
  return <DateContext.Provider value={{ date, setDate }}>{children}</DateContext.Provider>;
}

export function useDate(): DateContextValue {
  const ctx = useContext(DateContext);
  if (!ctx) throw new Error("useDate must be used within DateProvider");
  return ctx;
}
