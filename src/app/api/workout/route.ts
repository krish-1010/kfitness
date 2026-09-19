import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workoutSessions, exerciseLog, exercises } from "@/lib/schema";
import { resolveDayType, resolveVariant } from "@/lib/rotation";
import { getLinkCounts } from "@/lib/exerciseLinks";
import { getSetsByLogId } from "@/lib/exerciseSetLog";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date query param required" }, { status: 400 });
  }

  // A previewDayType lets the UI show what another day type would look like
  // (exercise list, strength/hypertrophy variant) WITHOUT writing anything —
  // browsing "what would Legs look like today" must never silently commit
  // today as a Legs day. Only an explicit action (logging an exercise,
  // marking the day done/rest) writes a row, via POST below.
  const previewDayType = req.nextUrl.searchParams.get("previewDayType") as
    | "Push"
    | "Pull"
    | "Legs"
    | "Rest"
    | null;

  const session = previewDayType
    ? { dayType: previewDayType, status: "planned", suggested: true }
    : await resolveDayType(userId, date);
  const variant = session.dayType === "Rest" ? null : await resolveVariant(userId, session.dayType, date);

  const log = await db
    .select({
      id: exerciseLog.id,
      exerciseId: exerciseLog.exerciseId,
      targetSets: exerciseLog.sets,
      done: exerciseLog.done,
      name: exercises.name,
      defaultSets: exercises.defaultSets,
      defaultReps: exercises.defaultReps,
      restSeconds: exercises.restSeconds,
      block: exercises.block,
      muscleGroup: exercises.muscleGroup,
      trackingType: exercises.trackingType,
    })
    .from(exerciseLog)
    .leftJoin(exercises, eq(exerciseLog.exerciseId, exercises.id))
    .where(and(eq(exerciseLog.userId, userId), eq(exerciseLog.date, date)));

  const linkCounts = await getLinkCounts(log.map((r) => r.exerciseId));
  const setsByLogId = await getSetsByLogId(log.map((r) => r.id));
  const logWithDetail = log.map((r) => ({
    ...r,
    linkCount: linkCounts[r.exerciseId] ?? 0,
    sets: setsByLogId[r.id] ?? [],
  }));

  return NextResponse.json({ ...session, variant, log: logWithDetail });
}

// Commits a session row: marks it done/rest/skipped, or overrides the
// suggested day type (e.g. training Push/Pull/Legs on a suggested Rest day).
export async function POST(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const body = await req.json();
  const { date, dayType, status, isManualOverride } = body ?? {};

  if (!date || !dayType || !["Push", "Pull", "Legs", "Rest"].includes(dayType)) {
    return NextResponse.json(
      { error: "date and dayType (Push/Pull/Legs/Rest) are required" },
      { status: 400 }
    );
  }
  if (!status || !["planned", "done", "skipped", "rest"].includes(status)) {
    return NextResponse.json(
      { error: "status must be planned/done/skipped/rest" },
      { status: 400 }
    );
  }

  const existing = await db.select().from(workoutSessions).where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.date, date)));

  if (existing.length > 0) {
    await db
      .update(workoutSessions)
      .set({ dayType, status, isManualOverride: !!isManualOverride })
      .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.date, date)));
  } else {
    await db.insert(workoutSessions).values({
      userId,
      date,
      dayType,
      status,
      isManualOverride: !!isManualOverride,
    });
  }

  return NextResponse.json({ ok: true });
}
