"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { PROTEIN_GOAL, KCAL_GOAL } from "@/lib/constants";

type GoalsContextValue = {
  proteinGoal: number;
  kcalGoal: number;
  setProteinGoal: (n: number) => void;
  setKcalGoal: (n: number) => void;
};

const GoalsContext = createContext<GoalsContextValue | null>(null);

// Mounted once by (app)/layout.tsx, same shape as ThemeContext: reads the
// user's saved goals from the existing per-user `settings` table (the
// water_target_ml precedent) rather than introducing a new mechanism.
// Falls back to the shared PROTEIN_GOAL/KCAL_GOAL constants when unset, so
// an existing account with no settings row sees identical behavior to
// before this context existed.
export function GoalsProvider({ children }: { children: ReactNode }) {
  const [proteinGoal, setProteinGoalState] = useState(PROTEIN_GOAL);
  const [kcalGoal, setKcalGoalState] = useState(KCAL_GOAL);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings?key=protein_goal").then((r) => r.json()),
      fetch("/api/settings?key=kcal_goal").then((r) => r.json()),
    ]).then(([proteinData, kcalData]) => {
      const loadedProtein = Number(proteinData.value);
      const loadedKcal = Number(kcalData.value);
      if (Number.isFinite(loadedProtein) && loadedProtein > 0) setProteinGoalState(loadedProtein);
      if (Number.isFinite(loadedKcal) && loadedKcal > 0) setKcalGoalState(loadedKcal);
    });
  }, []);

  const setProteinGoal = (n: number) => {
    setProteinGoalState(n);
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "protein_goal", value: String(n) }),
    });
  };

  const setKcalGoal = (n: number) => {
    setKcalGoalState(n);
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "kcal_goal", value: String(n) }),
    });
  };

  return <GoalsContext.Provider value={{ proteinGoal, kcalGoal, setProteinGoal, setKcalGoal }}>{children}</GoalsContext.Provider>;
}

export function useGoals(): GoalsContextValue {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error("useGoals must be used within GoalsProvider");
  return ctx;
}
