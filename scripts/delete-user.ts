import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, inArray } from "drizzle-orm";
import * as schema from "../src/lib/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Usage: npx tsx scripts/delete-user.ts <email> [--yes]
//
// Permanently deletes a user and every row they own. No table in this
// schema uses a real DB foreign key / ON DELETE CASCADE (see the "isn't
// a DB foreign key" comments throughout schema.ts), so this walks every
// owning relationship by hand instead of relying on the database to
// clean up after a single DELETE FROM users.
//
// Defaults to a DRY RUN: prints exactly what would be deleted (row
// counts per table) without touching anything. Pass --yes to actually
// perform the deletion. This is irreversible — there is no undo and no
// soft-delete for any of these tables.
async function run() {
  const [email, ...flags] = process.argv.slice(2);
  const confirmed = flags.includes("--yes");
  if (!email) {
    console.error("Usage: npx tsx scripts/delete-user.ts <email> [--yes]");
    process.exit(1);
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!user) {
    console.error(`No user found with email ${email}.`);
    process.exit(1);
  }
  const userId = user.id;

  const plans = await db.select().from(schema.workoutPlans).where(eq(schema.workoutPlans.userId, userId));
  const planIds = plans.map((p) => p.id);
  const days = planIds.length > 0 ? await db.select().from(schema.planDays).where(inArray(schema.planDays.planId, planIds)) : [];

  const exercisesOwned = await db.select().from(schema.exercises).where(eq(schema.exercises.userId, userId));
  const exerciseIds = exercisesOwned.map((e) => e.id);
  const links = exerciseIds.length > 0 ? await db.select().from(schema.exerciseLinks).where(inArray(schema.exerciseLinks.exerciseId, exerciseIds)) : [];

  const exerciseLogRows = await db.select().from(schema.exerciseLog).where(eq(schema.exerciseLog.userId, userId));
  const exerciseLogIds = exerciseLogRows.map((r) => r.id);
  const setLogRows =
    exerciseLogIds.length > 0 ? await db.select().from(schema.exerciseSetLog).where(inArray(schema.exerciseSetLog.exerciseLogId, exerciseLogIds)) : [];

  const [sessions, weightRows, foodItems, supplementRows, supplementLogRows, waterRows, settingsRows, foodLibrary] = await Promise.all([
    db.select().from(schema.workoutSessions).where(eq(schema.workoutSessions.userId, userId)),
    db.select().from(schema.weights).where(eq(schema.weights.userId, userId)),
    db.select().from(schema.logItems).where(eq(schema.logItems.userId, userId)),
    db.select().from(schema.supplements).where(eq(schema.supplements.userId, userId)),
    db.select().from(schema.supplementLog).where(eq(schema.supplementLog.userId, userId)),
    db.select().from(schema.waterLog).where(eq(schema.waterLog.userId, userId)),
    db.select().from(schema.settings).where(eq(schema.settings.userId, userId)),
    db.select().from(schema.foods).where(eq(schema.foods.userId, userId)),
  ]);

  console.log(`\nUser: ${user.email} (id ${userId}, "${user.displayName}")`);
  console.log(confirmed ? "Deleting:" : "Would delete (dry run):");
  console.log(`  ${plans.length} workout plans, ${days.length} plan days`);
  console.log(`  ${exercisesOwned.length} exercises, ${links.length} tutorial links`);
  console.log(`  ${exerciseLogRows.length} exercise log rows, ${setLogRows.length} set log rows`);
  console.log(`  ${sessions.length} workout sessions`);
  console.log(`  ${weightRows.length} weight entries`);
  console.log(`  ${foodItems.length} logged food items, ${foodLibrary.length} food library entries`);
  console.log(`  ${supplementRows.length} supplements, ${supplementLogRows.length} supplement log rows`);
  console.log(`  ${waterRows.length} water log entries`);
  console.log(`  ${settingsRows.length} settings rows`);
  console.log(`  1 user account`);

  if (!confirmed) {
    console.log("\nDry run only — nothing was deleted. Re-run with --yes to actually delete all of this.");
    process.exit(0);
  }

  if (setLogRows.length > 0) await db.delete(schema.exerciseSetLog).where(inArray(schema.exerciseSetLog.exerciseLogId, exerciseLogIds));
  await db.delete(schema.exerciseLog).where(eq(schema.exerciseLog.userId, userId));
  if (links.length > 0) await db.delete(schema.exerciseLinks).where(inArray(schema.exerciseLinks.exerciseId, exerciseIds));
  await db.delete(schema.exercises).where(eq(schema.exercises.userId, userId));
  if (days.length > 0) await db.delete(schema.planDays).where(inArray(schema.planDays.planId, planIds));
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

  console.log(`\nDeleted user ${email} (id ${userId}) and all owned data.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
