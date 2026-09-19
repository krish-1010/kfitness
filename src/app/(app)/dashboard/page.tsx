"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import { FlameIcon } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { TODAY, toLocalDateStr } from "@/lib/date";
import { useDate } from "../_lib/DateContext";
import { useGoals } from "../_lib/GoalsContext";
import { CenteredLoading } from "../_components/shared";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";

type DayAggregate = {
  protein: number;
  kcal: number;
  workoutStatus: "planned" | "done" | "skipped" | "rest" | null;
  supplementsDone: number;
};

type DashboardData = {
  days: Record<string, DayAggregate>;
  supplementsTotal: number;
  streaks: { workout: number; supplement: number };
};

type WeightRow = { id: number; date: string; weight: number };

// Rolling-average charts need 7 extra days of lookback before the visible
// 30-day window so the first plotted point already has a full trailing
// average, not a partial one.
const CHART_WINDOW_DAYS = 30;
const ROLLING_AVERAGE_DAYS = 7;
const WEIGHT_WINDOW_DAYS = 90;

function subtractDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return toLocalDateStr(new Date(y!, m! - 1, d! - days));
}

// Parses a "YYYY-MM-DD" string as a local-timezone date, never via the
// Date constructor's own string-parsing (which treats a bare date string
// as UTC midnight) — same convention DateQuickJumpPopover already uses.
function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

function monthRangeFor(monthDate: Date): { from: string; to: string } {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  return { from: toLocalDateStr(new Date(year, month, 1)), to: toLocalDateStr(new Date(year, month + 1, 0)) };
}

type GoalHitStatus = "hit" | "partial" | "missed" | "none";

// Combined per-day signal for the calendar's coloring: "hit" requires
// every APPLICABLE criterion to pass (workout handled, food goals met if
// food was logged, full supplement adherence whenever the user has any
// active supplements — this last one is always applicable, not only on
// days supplements were actually logged, per the locked-in definition).
// "missed" fires on an explicit failure (workout skipped, or food logged
// but goals missed); "none" means nothing was recorded that date at all.
function classifyDay(day: DayAggregate | undefined, proteinGoal: number, kcalGoal: number, supplementsTotal: number): GoalHitStatus {
  if (!day) return "none";

  const workoutApplicable = day.workoutStatus !== null;
  const workoutSkipped = day.workoutStatus === "skipped";
  const workoutOk = day.workoutStatus === "done" || day.workoutStatus === "rest";

  const foodApplicable = day.protein > 0 || day.kcal > 0;
  const foodOk = foodApplicable && day.protein >= proteinGoal && day.kcal <= kcalGoal;
  const foodMissed = foodApplicable && !foodOk;

  const supplementApplicable = supplementsTotal > 0;
  const supplementOk = supplementApplicable && day.supplementsDone >= supplementsTotal;

  if (workoutSkipped || foodMissed) return "missed";

  const applicableCount = (workoutApplicable ? 1 : 0) + (foodApplicable ? 1 : 0) + (supplementApplicable ? 1 : 0);
  const passCount = (workoutOk ? 1 : 0) + (foodOk ? 1 : 0) + (supplementOk ? 1 : 0);

  if (applicableCount === 0) return "none";
  return passCount === applicableCount ? "hit" : "partial";
}

const STATUS_CLASS: Record<Exclude<GoalHitStatus, "none">, string> = {
  hit: "bg-success/20 text-success",
  partial: "bg-primary/15 text-primary",
  missed: "bg-destructive/20 text-destructive",
};

function DashboardDayButton(props: ComponentProps<typeof CalendarDayButton>) {
  const { modifiers } = props;
  const statusClass = modifiers.hit ? STATUS_CLASS.hit : modifiers.partial ? STATUS_CLASS.partial : modifiers.missed ? STATUS_CLASS.missed : "";
  return <CalendarDayButton {...props} className={statusClass} />;
}

// Trailing N-day average ending each day in the visible window, dividing
// by the fixed window size (not the count of days with logged data) — a
// day with nothing logged genuinely contributed 0, which should pull the
// average down, not be treated as "unknown" and excluded.
function buildRollingAverage(days: Record<string, DayAggregate>, today: string, key: "protein" | "kcal"): { date: string; value: number }[] {
  const points: { date: string; value: number }[] = [];
  for (let i = CHART_WINDOW_DAYS - 1; i >= 0; i--) {
    const date = subtractDays(today, i);
    let sum = 0;
    for (let j = 0; j < ROLLING_AVERAGE_DAYS; j++) {
      sum += days[subtractDays(date, j)]?.[key] ?? 0;
    }
    points.push({ date, value: Math.round((sum / ROLLING_AVERAGE_DAYS) * 10) / 10 });
  }
  return points;
}

const proteinChartConfig: ChartConfig = { protein: { label: "Protein (g)", color: "var(--chart-1)" } };
const kcalChartConfig: ChartConfig = { kcal: { label: "Calories", color: "var(--chart-2)" } };
const weightChartConfig: ChartConfig = { weight: { label: "Weight (kg)", color: "var(--chart-3)" } };

export default function DashboardPage() {
  // Dashboard's own rolling window/streaks anchor to the real system date,
  // not the app's shared useDate() value — clicking the calendar (added in
  // a later step) only moves the shared date for other pages, it doesn't
  // re-anchor this page's own numbers.
  const [today] = useState(TODAY());
  const [data, setData] = useState<DashboardData | null>(null);
  const [weights, setWeights] = useState<WeightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { proteinGoal, kcalGoal } = useGoals();
  // The calendar's day-click only moves the app's shared date (affects
  // other pages on next visit) — it never re-anchors this page's own
  // streaks/charts, which stay pinned to real `today` above.
  const { date, setDate } = useDate();
  const [visibleMonth, setVisibleMonth] = useState(() => parseLocalDate(today));
  const [coveredRange, setCoveredRange] = useState<{ from: string; to: string } | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    const from = subtractDays(today, CHART_WINDOW_DAYS + ROLLING_AVERAGE_DAYS);
    const res = await fetch(`/api/dashboard?from=${from}&to=${today}&today=${today}`);
    const json: DashboardData = await res.json();
    setData(json);
    setCoveredRange({ from, to: today });
  }, [today]);

  const loadWeights = useCallback(async () => {
    const res = await fetch("/api/weights");
    setWeights(await res.json());
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadDashboard(), loadWeights()]).finally(() => setLoading(false));
  }, [loadDashboard, loadWeights]);

  const handleMonthChange = async (newMonth: Date) => {
    setVisibleMonth(newMonth);
    if (!coveredRange) return;
    const { from: monthFrom, to: monthTo } = monthRangeFor(newMonth);
    const needFrom = monthFrom < coveredRange.from ? monthFrom : coveredRange.from;
    const needTo = monthTo > coveredRange.to ? monthTo : coveredRange.to;
    if (needFrom === coveredRange.from && needTo === coveredRange.to) return;
    setCalendarLoading(true);
    const res = await fetch(`/api/dashboard?from=${needFrom}&to=${needTo}&today=${today}`);
    const json: DashboardData = await res.json();
    setData(json);
    setCoveredRange({ from: needFrom, to: needTo });
    setCalendarLoading(false);
  };

  const proteinSeries = useMemo(() => buildRollingAverage(data?.days ?? {}, today, "protein"), [data, today]);
  const kcalSeries = useMemo(() => buildRollingAverage(data?.days ?? {}, today, "kcal"), [data, today]);
  const weightSeries = useMemo(() => {
    const cutoff = subtractDays(today, WEIGHT_WINDOW_DAYS);
    return weights.filter((w) => w.date >= cutoff).map((w) => ({ date: w.date, value: w.weight }));
  }, [weights, today]);

  const dayModifiers = useMemo(() => {
    const hit: Date[] = [];
    const partial: Date[] = [];
    const missed: Date[] = [];
    for (const [dateStr, day] of Object.entries(data?.days ?? {})) {
      const status = classifyDay(day, proteinGoal, kcalGoal, data?.supplementsTotal ?? 0);
      if (status === "hit") hit.push(parseLocalDate(dateStr));
      else if (status === "partial") partial.push(parseLocalDate(dateStr));
      else if (status === "missed") missed.push(parseLocalDate(dateStr));
    }
    return { hit, partial, missed };
  }, [data, proteinGoal, kcalGoal]);

  if (loading || !data) return <CenteredLoading />;

  return (
    <div>
      <div className="section-label">DASHBOARD</div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1.5">
            <FlameIcon className="size-3.5 text-primary" />
            WORKOUT STREAK
          </div>
          <div className="text-2xl font-bold">
            {data.streaks.workout}
            <span className="text-sm text-muted-foreground font-normal"> day{data.streaks.workout === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1.5">
            <FlameIcon className="size-3.5 text-primary" />
            SUPPLEMENT STREAK
          </div>
          <div className="text-2xl font-bold">
            {data.streaks.supplement}
            <span className="text-sm text-muted-foreground font-normal"> day{data.streaks.supplement === 1 ? "" : "s"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card">
          <div className="text-[11px] text-muted-foreground mb-1.5">PROTEIN (7-DAY AVG)</div>
          <ChartContainer config={proteinChartConfig} className="h-[140px] w-full aspect-auto">
            <LineChart data={proteinSeries} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tickLine={false} axisLine={false} fontSize={10} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} fontSize={10} width={32} />
              <ReferenceLine y={proteinGoal} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line dataKey="value" name="protein" type="monotone" stroke="var(--color-protein)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </div>
        <div className="card">
          <div className="text-[11px] text-muted-foreground mb-1.5">CALORIES (7-DAY AVG)</div>
          <ChartContainer config={kcalChartConfig} className="h-[140px] w-full aspect-auto">
            <LineChart data={kcalSeries} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tickLine={false} axisLine={false} fontSize={10} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} fontSize={10} width={38} />
              <ReferenceLine y={kcalGoal} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line dataKey="value" name="kcal" type="monotone" stroke="var(--color-kcal)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </div>
      </div>

      <div className="card mb-4">
        <div className="text-[11px] text-muted-foreground mb-1.5">WEIGHT TREND</div>
        <ChartContainer config={weightChartConfig} className="h-[180px] w-full aspect-auto">
          <LineChart data={weightSeries} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tickLine={false} axisLine={false} fontSize={10} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} fontSize={10} width={40} domain={["dataMin - 1", "dataMax + 1"]} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line dataKey="value" name="weight" type="monotone" stroke="var(--color-weight)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] text-muted-foreground">CALENDAR</div>
          {calendarLoading && <div className="text-[11px] text-muted-foreground">Loading…</div>}
        </div>
        <div className="flex justify-center">
          <Calendar
            mode="single"
            month={visibleMonth}
            onMonthChange={handleMonthChange}
            selected={parseLocalDate(date)}
            onSelect={(d) => d && setDate(toLocalDateStr(d))}
            modifiers={dayModifiers}
            components={{ DayButton: DashboardDayButton }}
          />
        </div>
      </div>
    </div>
  );
}
