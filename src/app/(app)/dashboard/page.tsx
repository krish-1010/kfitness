"use client";

import { useCallback, useEffect, useState } from "react";
import { FlameIcon } from "lucide-react";
import { TODAY, toLocalDateStr } from "@/lib/date";
import { CenteredLoading } from "../_components/shared";

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

export default function DashboardPage() {
  // Dashboard's own rolling window/streaks anchor to the real system date,
  // not the app's shared useDate() value — clicking the calendar (added in
  // a later step) only moves the shared date for other pages, it doesn't
  // re-anchor this page's own numbers.
  const [today] = useState(TODAY());
  const [data, setData] = useState<DashboardData | null>(null);
  const [weights, setWeights] = useState<WeightRow[]>([]);
  const [loading, setLoading] = useState(true);

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
    </div>
  );
}
