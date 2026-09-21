import { eq, inArray } from "drizzle-orm";
import { db } from "./db";
import * as schema from "./schema";

// Permanently deletes a user and every row they own. No table in this
// schema uses a real DB foreign key / ON DELETE CASCADE (see the "isn't a
// DB foreign key" comments throughout schema.ts), so this walks every
// owning relationship by hand rather than relying on the database to clean
// up after a single DELETE FROM users. Shared by scripts/delete-user.ts
// (admin-run) and the self-service DELETE /api/me route, so the two never
// drift apart on which tables actually need cleaning.
export async function deleteUserData(userId: number): Promise<void> {
  const plans = await db.select({ id: schema.workoutPlans.id }).from(schema.workoutPlans).where(eq(schema.workoutPlans.userId, userId));
  const planIds = plans.map((p) => p.id);

  const exercisesOwned = await db.select({ id: schema.exercises.id }).from(schema.exercises).where(eq(schema.exercises.userId, userId));
  const exerciseIds = exercisesOwned.map((e) => e.id);

  const exerciseLogRows = await db.select({ id: schema.exerciseLog.id }).from(schema.exerciseLog).where(eq(schema.exerciseLog.userId, userId));
  const exerciseLogIds = exerciseLogRows.map((r) => r.id);

  if (exerciseLogIds.length > 0) await db.delete(schema.exerciseSetLog).where(inArray(schema.exerciseSetLog.exerciseLogId, exerciseLogIds));
  await db.delete(schema.exerciseLog).where(eq(schema.exerciseLog.userId, userId));
  if (exerciseIds.length > 0) await db.delete(schema.exerciseLinks).where(inArray(schema.exerciseLinks.exerciseId, exerciseIds));
  await db.delete(schema.exercises).where(eq(schema.exercises.userId, userId));
  if (planIds.length > 0) await db.delete(schema.planDays).where(inArray(schema.planDays.planId, planIds));
  await db.delete(schema.workoutPlans).where(eq(schema.workoutPlans.userId, userId));
  await db.delete(schema.workoutSessions).where(eq(schema.workoutSessions.userId, userId));
  await db.delete(schema.weights).where(eq(schema.weights.userId, userId));
  await db.delete(schema.logItems).where(eq(schema.logItems.userId, userId));
  await db.delete(schema.supplementLog).where(eq(schema.supplementLog.userId, userId));
  await db.delete(schema.supplements).where(eq(schema.supplements.userId, userId));
  await db.delete(schema.waterLog).where(eq(schema.waterLog.userId, userId));
  await db.delete(schema.settings).where(eq(schema.settings.userId, userId));
  await db.delete(schema.foods).where(eq(schema.foods.userId, userId));
  await db.delete(schema.users).where(eq(schema.users.id, userId));
}
