export function ProgressBar({
  value,
  goal,
  variant,
}: {
  value: number;
  goal: number;
  variant?: "default" | "good" | "over";
}) {
  const pct = Math.min(100, (value / goal) * 100);
  const variantClass = variant === "good" ? "bg-success" : variant === "over" ? "bg-destructive" : "bg-primary";
  return (
    <div className="h-2 bg-background overflow-hidden border border-border">
      <div className={`h-full transition-[width] duration-300 ease-out ${variantClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Byte-for-byte-identical loading block that used to be duplicated inline
// across page.tsx, food/page.tsx, supplements/page.tsx, water/page.tsx,
// and weight/page.tsx — one shared component instead of five copies.
export function CenteredLoading() {
  return <div className="centered-loading">Loading…</div>;
}
