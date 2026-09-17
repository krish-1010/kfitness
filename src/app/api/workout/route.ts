import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workoutSessions, exerciseLog, exercises } from "@/lib/schema";
import { resolveDayType, resolveVariant } from "@/lib/rotation";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date query param required" }, { status: 400 });
  }

  const session = await resolveDayType(date);
  const variant = session.dayType === "Rest" ? null : await resolveVariant(session.dayType, date);

  const log = await db
    .select({
      id: exerciseLog.id,
      exerciseId: exerciseLog.exerciseId,
      sets: exerciseLog.sets,
      reps: exerciseLog.reps,
      weight: exerciseLog.weight,
      done: exerciseLog.done,
      name: exercises.name,
      defaultSets: exercises.defaultSets,
      defaultReps: exercises.defaultReps,
      restSeconds: exercises.restSeconds,
      block: exercises.block,
      muscleGroup: exercises.muscleGroup,
      videoUrl: exercises.videoUrl,
    })
    .from(exerciseLog)
    .leftJoin(exercises, eq(exerciseLog.exerciseId, exercises.id))
    .where(eq(exerciseLog.date, date));

  return NextResponse.json({ ...session, variant, log });
}

// Commits a session row: marks it done/rest/skipped, or overrides the
// suggested day type (e.g. training Push/Pull/Legs on a suggested Rest day).
export async function POST(req: NextRequest) {
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

  const existing = await db.select().from(workoutSessions).where(eq(workoutSessions.date, date));

  if (existing.length > 0) {
    await db
      .update(workoutSessions)
      .set({ dayType, status, isManualOverride: !!isManualOverride })
      .where(eq(workoutSessions.date, date));
  } else {
    await db.insert(workoutSessions).values({
      date,
      dayType,
      status,
      isManualOverride: !!isManualOverride,
    });
  }

  return NextResponse.json({ ok: true });
}
