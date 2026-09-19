import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exerciseLog, exerciseSetLog, exercises } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

// Toggles the whole-exercise `done` flag, or swaps which exercise this log
// row points to (the alternative-exercise "⇄" affordance — equipment
// substitution mid-session). Per-set reps/weight/duration/distance are
// edited via /api/workout/log/[id]/sets/[setId]; swapping deliberately
// leaves existing exerciseSetLog rows untouched, so any sets already logged
// carry over onto the substituted exercise rather than resetting.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getCurrentUserId(req);
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const { done, exerciseId } = body ?? {};

  const patch: Partial<typeof exerciseLog.$inferInsert> = {};
  if (typeof done === "boolean") patch.done = done;
  if (typeof exerciseId === "number") {
    const [owned] = await db.select({ id: exercises.id }).from(exercises).where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)));
    if (!owned) {
      return NextResponse.json({ error: "invalid exerciseId" }, { status: 400 });
    }
    patch.exerciseId = exerciseId;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "done (boolean) or exerciseId (number) is required" }, { status: 400 });
  }

  const [row] = await db
    .update(exerciseLog)
    .set(patch)
    .where(and(eq(exerciseLog.id, numericId), eq(exerciseLog.userId, userId)))
    .returning();
  return NextResponse.json(row);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getCurrentUserId(req);
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  // No DB foreign key, so the child set rows need an explicit delete first.
  await db.delete(exerciseSetLog).where(eq(exerciseSetLog.exerciseLogId, numericId));
  await db.delete(exerciseLog).where(and(eq(exerciseLog.id, numericId), eq(exerciseLog.userId, userId)));
  return NextResponse.json({ ok: true });
}
