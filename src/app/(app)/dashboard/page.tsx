"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FlameIcon } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { TODAY, toLocalDateStr } from "@/lib/date";
import { useGoals } from "../_lib/GoalsContext";
import { CenteredLoading } from "../_components/shared";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

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

function subtractDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return toLocalDateStr(new Date(y!, m! - 1, d! - days));
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

  const loadDashboard = useCallback(async () => {
    const from = subtractDays(today, CHART_WINDOW_DAYS + ROLLING_AVERAGE_DAYS);
    const res = await fetch(`/api/dashboard?from=${from}&to=${today}&today=${today}`);
    setData(await res.json());
  }, [today]);

  const loadWeights = useCallback(async () => {
    const res = await fetch("/api/weights");
    setWeights(await res.json());
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadDashboard(), loadWeights()]).finally(() => setLoading(false));
  }, [loadDashboard, loadWeights]);

  const proteinSeries = useMemo(() => buildRollingAverage(data?.days ?? {}, today, "protein"), [data, today]);
  const kcalSeries = useMemo(() => buildRollingAverage(data?.days ?? {}, today, "kcal"), [data, today]);

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
            <LineChart data={proteinSeries} margin={{ top: 5, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tickLine={false} axisLine={false} fontSize={10} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} fontSize={10} width={28} />
              <ReferenceLine y={proteinGoal} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line dataKey="value" name="protein" type="monotone" stroke="var(--color-protein)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </div>
        <div className="card">
          <div className="text-[11px] text-muted-foreground mb-1.5">CALORIES (7-DAY AVG)</div>
          <ChartContainer config={kcalChartConfig} className="h-[140px] w-full aspect-auto">
            <LineChart data={kcalSeries} margin={{ top: 5, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tickLine={false} axisLine={false} fontSize={10} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} fontSize={10} width={32} />
              <ReferenceLine y={kcalGoal} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line dataKey="value" name="kcal" type="monotone" stroke="var(--color-kcal)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
