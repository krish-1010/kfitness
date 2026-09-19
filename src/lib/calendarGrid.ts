// Pure month-grid math shared by the header's date quick-jump popover and
// (eventually) Phase 4's real Dashboard calendar — only the grid layout is
// shared; each caller renders it differently (a bare click-to-jump grid here
// vs. an annotated goal-hit grid later), so this file stays render-free.
export function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay(); // 0 = Sunday

  const cells: (Date | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
