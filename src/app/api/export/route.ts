import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

// GET /api/export -> a full JSON dump of everything the current account
// owns, as a downloadable file. This is the app's only backup/restore-
// adjacent feature — see HANDOFF.md for why a separate import/restore path
// and a dedicated cloud-backup integration were deliberately not built
// (Neon already backs up the database itself; this covers "I have my own
// copy of my data").
export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req);

  const [account] = await db
    .select({ email: schema.users.email, displayName: schema.users.displayName, createdAt: schema.users.createdAt })
    .from(schema.users)
    .where(eq(schema.users.id, userId));

  const workoutPlans = await db.select().from(schema.workoutPlans).where(eq(schema.workoutPlans.userId, userId));
  const planIds = workoutPlans.map((p) => p.id);
  const planDays = planIds.length > 0 ? await db.select().from(schema.planDays).where(inArray(schema.planDays.planId, planIds)) : [];

  const exercises = await db.select().from(schema.exercises).where(eq(schema.exercises.userId, userId));
  const exerciseIds = exercises.map((e) => e.id);
  const exerciseLinks = exerciseIds.length > 0 ? await db.select().from(schema.exerciseLinks).where(inArray(schema.exerciseLinks.exerciseId, exerciseIds)) : [];

  const exerciseLog = await db.select().from(schema.exerciseLog).where(eq(schema.exerciseLog.userId, userId));
  const exerciseLogIds = exerciseLog.map((r) => r.id);
  const exerciseSetLog =
    exerciseLogIds.length > 0 ? await db.select().from(schema.exerciseSetLog).where(inArray(schema.exerciseSetLog.exerciseLogId, exerciseLogIds)) : [];

  const [workoutSessions, weights, logItems, foods, supplements, supplementLog, waterLog, settings] = await Promise.all([
    db.select().from(schema.workoutSessions).where(eq(schema.workoutSessions.userId, userId)),
    db.select().from(schema.weights).where(eq(schema.weights.userId, userId)),
    db.select().from(schema.logItems).where(eq(schema.logItems.userId, userId)),
    db.select().from(schema.foods).where(eq(schema.foods.userId, userId)),
    db.select().from(schema.supplements).where(eq(schema.supplements.userId, userId)),
    db.select().from(schema.supplementLog).where(eq(schema.supplementLog.userId, userId)),
    db.select().from(schema.waterLog).where(eq(schema.waterLog.userId, userId)),
    db.select().from(schema.settings).where(eq(schema.settings.userId, userId)),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    account,
    workoutPlans,
    planDays,
    exercises,
    exerciseLinks,
    workoutSessions,
    exerciseLog,
    exerciseSetLog,
    weights,
    logItems,
    foods,
    supplements,
    supplementLog,
    waterLog,
    settings,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="fitr-export.json"',
    },
  });
}
