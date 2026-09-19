import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { logItems, workoutSessions, supplementLog, supplements } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

// Defensive bound on the streak backward-scan — an accepted approximation
// at this app's 1-5-user scale, same spirit as other decoupling comments
// in schema.ts. A genuine streak longer than this reports as capped
// rather than growing further.
const STREAK_LOOKBACK_DAYS = 400;

type DayAggregate = {
  protein: number;
  kcal: number;
  workoutStatus: "planned" | "done" | "skipped" | "rest" | null;
  supplementsDone: number;
};

function subtractDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d! - days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// GET /api/dashboard?from=&to=&today= — per-day protein/kcal/workout/
// supplement aggregates over [from, to], plus workout and supplement
// streaks computed independently over a fixed lookback ending at `today`.
//
// `today` is REQUIRED and client-supplied. This route must never call
// `new Date()` with no arguments. This codebase deliberately keeps all
// "what is today" logic client-side (src/lib/date.ts's TODAY()/
// toLocalDateStr) to avoid the classic bug where a server running in UTC
// (Vercel functions) disagrees with the user's local calendar date near
// midnight in a positive-UTC-offset zone like IST — the streak backward
// walk is the first place this app would need a "today" anchor
// server-side, so it must reuse the client's own TODAY() string rather
// than compute its own.
export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const today = req.nextUrl.searchParams.get("today");
  if (!from || !to || !today) {
    return NextResponse.json({ error: "from, to, and today query params are required" }, { status: 400 });
  }

  const [rangeLogItems, rangeSessions, rangeSupplementLog, activeSupplements] = await Promise.all([
    db.select().from(logItems).where(and(eq(logItems.userId, userId), gte(logItems.date, from), lte(logItems.date, to))),
    db.select().from(workoutSessions).where(and(eq(workoutSessions.userId, userId), gte(workoutSessions.date, from), lte(workoutSessions.date, to))),
    db
      .select()
      .from(supplementLog)
      .where(and(eq(supplementLog.userId, userId), eq(supplementLog.done, true), gte(supplementLog.date, from), lte(supplementLog.date, to))),
    db.select().from(supplements).where(and(eq(supplements.userId, userId), eq(supplements.archived, false))),
  ]);

  const supplementsTotal = activeSupplements.length;

  const days: Record<string, DayAggregate> = {};
  const ensure = (date: string): DayAggregate => {
    if (!days[date]) days[date] = { protein: 0, kcal: 0, workoutStatus: null, supplementsDone: 0 };
    return days[date]!;
  };

  for (const item of rangeLogItems) {
    const day = ensure(item.date);
    day.protein += item.protein;
    day.kcal += item.kcal;
  }
  for (const session of rangeSessions) {
    ensure(session.date).workoutStatus = session.status as DayAggregate["workoutStatus"];
  }
  for (const row of rangeSupplementLog) {
    ensure(row.date).supplementsDone += 1;
  }

  // Streaks: independent scans over a fixed lookback window ending at
  // `today`, bounded by real dates (not row count, since a day can carry
  // multiple supplement-log rows) — not tied to the requested from/to range.
  const streakCutoff = subtractDays(today, STREAK_LOOKBACK_DAYS);
  const [streakSessions, streakSupplementLog] = await Promise.all([
    db
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), gte(workoutSessions.date, streakCutoff), lte(workoutSessions.date, today))),
    db
      .select()
      .from(supplementLog)
      .where(
        and(eq(supplementLog.userId, userId), eq(supplementLog.done, true), gte(supplementLog.date, streakCutoff), lte(supplementLog.date, today))
      ),
  ]);

  const sessionStatusByDate = new Map(streakSessions.map((s) => [s.date, s.status]));
  const supplementDoneCountByDate = new Map<string, number>();
  for (const row of streakSupplementLog) {
    supplementDoneCountByDate.set(row.date, (supplementDoneCountByDate.get(row.date) ?? 0) + 1);
  }

  let workoutStreak = 0;
  let cursor = today;
  for (let i = 0; i < STREAK_LOOKBACK_DAYS; i++) {
    const status = sessionStatusByDate.get(cursor);
    if (status === "done" || status === "rest") {
      workoutStreak++;
      cursor = subtractDays(cursor, 1);
    } else {
      break;
    }
  }

  let supplementStreak = 0;
  cursor = today;
  for (let i = 0; i < STREAK_LOOKBACK_DAYS; i++) {
    const doneCount = supplementDoneCountByDate.get(cursor) ?? 0;
    if (supplementsTotal > 0 && doneCount >= supplementsTotal) {
      supplementStreak++;
      cursor = subtractDays(cursor, 1);
    } else {
      break;
    }
  }

  return NextResponse.json({
    days,
    supplementsTotal,
    streaks: { workout: workoutStreak, supplement: supplementStreak },
  });
}
