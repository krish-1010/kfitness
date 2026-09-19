// Formats a Date using its LOCAL calendar fields, never toISOString() (which
// converts to UTC first). In any positive-UTC-offset timezone like IST,
// local midnight is the previous day in UTC, so toISOString().slice(0,10)
// silently loses a day on every round trip — this avoids that entirely.
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const TODAY = () => toLocalDateStr(new Date());
