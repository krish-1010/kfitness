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

// Deprecated call sites still pass a raw `color` string — kept working
// while pages migrate one at a time. New call sites should use `variant`
// instead, which resolves the fill via a CSS class so callers don't need
// to import a color constant just to pick one.
export function ProgressBar({
  value,
  goal,
  color,
  variant,
}: {
  value: number;
  goal: number;
  color?: string;
  variant?: "default" | "good" | "over";
}) {
  const pct = Math.min(100, (value / goal) * 100);
  const variantClass = variant === "good" ? "bg-success" : variant === "over" ? "bg-destructive" : variant === "default" ? "bg-primary" : "";
  return (
    <div className="h-2 bg-background overflow-hidden border border-border">
      <div
        className={`h-full transition-[width] duration-300 ease-out ${variantClass}`}
        style={{ width: `${pct}%`, ...(color ? { background: color } : {}) }}
      />
    </div>
  );
}

// Byte-for-byte-identical loading block that used to be duplicated inline
// across page.tsx, food/page.tsx, supplements/page.tsx, water/page.tsx,
// and weight/page.tsx — one shared component instead of five copies.
export function CenteredLoading() {
  return <div className="centered-loading">Loading…</div>;
}
