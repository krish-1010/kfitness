// Color palette and base style objects shared across every page in the
// (app) route group — moved verbatim out of the old monolithic page.tsx so
// Workout/Food/Supplements/Weight/Water/Dashboard/Profile all look
// consistent without duplicating these constants per file.
export const ink = "#EDEAE3",
  inkDim = "#9A968C",
  bg = "#15140F",
  bg2 = "#1D1B15",
  line = "#2C2A22",
  amber = "#D4922C",
  green = "#7FA66B",
  red = "#C1604B",
  blue = "#6B9BC1",
  purple = "#A67FB5";

export const cardStyle = { background: bg2, border: `1px solid ${line}`, padding: 14 } as const;

export const inputStyle = {
  background: bg,
  border: `1px solid ${line}`,
  color: ink,
  padding: "9px 10px",
  fontSize: 14,
  outline: "none",
  width: "100%",
} as const;
export const smallInputStyle = { ...inputStyle, padding: "6px 8px", fontSize: 13 } as const;
export const primaryBtn = {
  background: amber,
  border: "none",
  color: bg,
  padding: "9px 16px",
  fontSize: 14,
  fontWeight: 600,
  whiteSpace: "nowrap",
} as const;
export const secondaryBtn = { background: "none", border: `1px solid ${line}`, color: inkDim, padding: "9px 16px", fontSize: 14 } as const;
export const tinyBtn = { background: "none", border: `1px solid ${line}`, color: inkDim, padding: "5px 10px", fontSize: 12 } as const;
export const sectionLabel = { marginBottom: 8, fontSize: 13, color: inkDim, fontWeight: 600, letterSpacing: 0.3 } as const;
export const navBtn = {
  width: 36,
  height: 36,
  background: bg2,
  border: `1px solid ${line}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

export function ProgressBar({ value, goal, color }: { value: number; goal: number; color: string }) {
  const pct = Math.min(100, (value / goal) * 100);
  return (
    <div style={{ height: 8, background: bg, overflow: "hidden", border: `1px solid ${line}` }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s ease" }} />
    </div>
  );
}
