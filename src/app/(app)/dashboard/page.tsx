"use client";

import { inkDim, cardStyle, sectionLabel } from "../_components/shared";

// Placeholder for Phase 4: rolling protein/kcal averages, weight trend,
// workout/supplement streaks, and the full month-grid calendar (colored by
// daily goal-hit status, click a day to jump the shared date). Deliberately
// not built here — this task only creates the destination so it's reachable
// in the nav; the real content is a separate future session.
export default function DashboardPage() {
  return (
    <div>
      <div style={sectionLabel}>DASHBOARD</div>
      <div style={{ ...cardStyle, textAlign: "center", padding: 32, color: inkDim }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
        <div style={{ fontSize: 15, marginBottom: 6, color: "#EDEAE3" }}>Coming soon</div>
        <div style={{ fontSize: 13 }}>Rolling protein/kcal averages, weight trend, workout streaks, and a full calendar view.</div>
      </div>
    </div>
  );
}
