import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { workoutSessions, exerciseLog, exercises, planDays } from "@/lib/schema";
import { resolveDayType, resolveVariant, type ResolvedDay } from "@/lib/rotation";
import { getLinkCounts } from "@/lib/exerciseLinks";
import { getSetsByLogId } from "@/lib/exerciseSetLog";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date query param required" }, { status: 400 });
  }

  // previewPlanDayId lets the UI show what another plan day would look like
  // (exercise list, strength/hypertrophy variant) WITHOUT writing anything —
  // browsing "what would Legs look like today" must never silently commit
  // today as a Legs day. Only an explicit action (logging an exercise,
  // marking the day done/rest) writes a row, via POST below. The literal
  // "rest" previews a rest day; a numeric id previews that plan_day.
  const previewParam = req.nextUrl.searchParams.get("previewPlanDayId");

  let session: ResolvedDay;
  if (previewParam === "rest") {
    session = { planDayId: null, label: "Rest", variantMode: "none", status: "planned", suggested: true };
  } else if (previewParam) {
    const previewId = Number(previewParam);
    const [day] = await db.select().from(planDays).where(eq(planDays.id, previewId));
    session = day
      ? { planDayId: day.id, label: day.label, variantMode: day.variantMode as "none" | "strength_hypertrophy", status: "planned", suggested: true }
      : await resolveDayType(userId, date);
  } else {
    session = await resolveDayType(userId, date);
  }

  const variant = session.planDayId === null ? null : await resolveVariant(userId, session.planDayId, date);

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
      alternativeGroupId: exercises.alternativeGroupId,
    })
    .from(exerciseLog)
    .leftJoin(exercises, eq(exerciseLog.exerciseId, exercises.id))
    .where(and(eq(exerciseLog.userId, userId), eq(exerciseLog.date, date)));

  const linkCounts = await getLinkCounts(log.map((r) => r.exerciseId));
  const setsByLogId = await getSetsByLogId(log.map((r) => r.id));

  // Resolve each logged exercise's swap candidates server-side (rather than
  // relying on the client having exerciseOptions/allExercises loaded) — any
  // other non-archived exercise of this user's sharing the same
  // alternativeGroupId is interchangeable with it.
  const altGroupIds = Array.from(
    new Set(log.map((r) => r.alternativeGroupId).filter((x): x is number => x != null))
  );
  const alternativesByGroup: Record<number, { id: number; name: string }[]> = {};
  if (altGroupIds.length > 0) {
    const altRows = await db
      .select({ id: exercises.id, name: exercises.name, alternativeGroupId: exercises.alternativeGroupId })
      .from(exercises)
      .where(and(eq(exercises.userId, userId), eq(exercises.archived, false), inArray(exercises.alternativeGroupId, altGroupIds)));
    for (const r of altRows) {
      if (r.alternativeGroupId == null) continue;
      (alternativesByGroup[r.alternativeGroupId] ??= []).push({ id: r.id, name: r.name });
    }
  }

  const logWithDetail = log.map((r) => ({
    ...r,
    linkCount: linkCounts[r.exerciseId] ?? 0,
    sets: setsByLogId[r.id] ?? [],
    alternatives: r.alternativeGroupId != null ? (alternativesByGroup[r.alternativeGroupId] ?? []).filter((a) => a.id !== r.exerciseId) : [],
  }));

  return NextResponse.json({ ...session, variant, log: logWithDetail });
}

// Commits a session row: marks it done/rest/skipped, or overrides the
// suggested plan day (e.g. training on a suggested Rest day). planDayId
// null means Rest.
export async function POST(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const body = await req.json();
  const { date, planDayId, status, isManualOverride } = body ?? {};

  if (!date || (planDayId !== null && typeof planDayId !== "number")) {
    return NextResponse.json(
      { error: "date and planDayId (number or null for Rest) are required" },
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
      .set({ planDayId, status, isManualOverride: !!isManualOverride })
      .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.date, date)));
  } else {
    await db.insert(workoutSessions).values({
      userId,
      date,
      planDayId,
      status,
      isManualOverride: !!isManualOverride,
    });
  }

  return NextResponse.json({ ok: true });
}
