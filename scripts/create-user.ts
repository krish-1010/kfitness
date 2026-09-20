import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "../src/lib/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Usage: npx tsx scripts/create-user.ts <email> <password> [displayName] [templateUserId]
//
// Creates a new account and seeds its foods/supplements/exercises by
// copying another user's current *active* library (default: user 1, the
// original account) rather than re-declaring the default data a second
// time — new accounts start with whatever the template account actually
// has live today, muscle-coverage fixes and all, and can customize
// independently from there.
async function run() {
  const [email, password, displayName, templateArg] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: npx tsx scripts/create-user.ts <email> <password> [displayName] [templateUserId]");
    process.exit(1);
  }
  const templateUserId = templateArg ? Number(templateArg) : 1;

  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing.length > 0) {
    console.error(`A user with email ${email} already exists (id ${existing[0]!.id}).`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(schema.users)
    .values({ email, passwordHash, displayName: displayName || "" })
    .returning();
  console.log(`Created user id=${user!.id} email=${email}`);

  const templateFoods = await db
    .select()
    .from(schema.foods)
    .where(and(eq(schema.foods.userId, templateUserId), eq(schema.foods.archived, false)));
  if (templateFoods.length > 0) {
    await db.insert(schema.foods).values(
      templateFoods.map((f) => ({ userId: user!.id, name: f.name, protein: f.protein, kcal: f.kcal }))
    );
  }
  console.log(`Copied ${templateFoods.length} foods from user ${templateUserId}`);

  const templateSupplements = await db
    .select()
    .from(schema.supplements)
    .where(and(eq(schema.supplements.userId, templateUserId), eq(schema.supplements.archived, false)));
  if (templateSupplements.length > 0) {
    await db.insert(schema.supplements).values(
      templateSupplements.map((s) => ({ userId: user!.id, name: s.name, time: s.time }))
    );
  }
  console.log(`Copied ${templateSupplements.length} supplements from user ${templateUserId}`);

  // Copy the template's active plan structure (plan_days), then the
  // exercises mapped onto it — exercises reference planDayId, so the new
  // user needs their own plan_days rows before exercises can be copied.
  const [templatePlan] = await db
    .select()
    .from(schema.workoutPlans)
    .where(and(eq(schema.workoutPlans.userId, templateUserId), eq(schema.workoutPlans.isActive, true), eq(schema.workoutPlans.archived, false)));

  if (!templatePlan) {
    console.log(`Template user ${templateUserId} has no active plan -- skipping plan/exercise copy. Create a plan for the new user manually.`);
  } else {
    const [newPlan] = await db
      .insert(schema.workoutPlans)
      .values({ userId: user!.id, name: templatePlan.name, isActive: true, fixedRestWeekday: templatePlan.fixedRestWeekday })
      .returning();
    console.log(`Created plan id=${newPlan!.id} (${newPlan!.name})`);

    const templateDays = await db
      .select()
      .from(schema.planDays)
      .where(eq(schema.planDays.planId, templatePlan.id))
      .orderBy(schema.planDays.dayIndex);

    const oldToNewDayId: Record<number, number> = {};
    for (const day of templateDays) {
      const [newDay] = await db
        .insert(schema.planDays)
        .values({ planId: newPlan!.id, dayIndex: day.dayIndex, label: day.label, variantMode: day.variantMode })
        .returning();
      oldToNewDayId[day.id] = newDay!.id;
    }
    console.log(`Copied ${templateDays.length} plan days`);

    const templateExercises = await db
      .select()
      .from(schema.exercises)
      .where(and(eq(schema.exercises.userId, templateUserId), eq(schema.exercises.archived, false)));

    // Inserted one at a time (not a single batched values([...])) so each
    // new row's id can be captured immediately via .returning() -- needed
    // to remap tutorial links onto the new exercise ids below, same
    // old-id -> new-id pattern already used for planDays above.
    const oldToNewExerciseId: Record<number, number> = {};
    for (const e of templateExercises) {
      const [newEx] = await db
        .insert(schema.exercises)
        .values({
          userId: user!.id,
          name: e.name,
          planDayId: oldToNewDayId[e.planDayId]!,
          defaultSets: e.defaultSets,
          defaultReps: e.defaultReps,
          restSeconds: e.restSeconds,
          variant: e.variant,
          block: e.block,
          muscleGroup: e.muscleGroup,
          trackingType: e.trackingType,
        })
        .returning();
      oldToNewExerciseId[e.id] = newEx!.id;
    }
    console.log(`Copied ${templateExercises.length} exercises from user ${templateUserId}`);

    const templateExerciseIds = templateExercises.map((e) => e.id);
    if (templateExerciseIds.length > 0) {
      const templateLinks = await db.select().from(schema.exerciseLinks).where(inArray(schema.exerciseLinks.exerciseId, templateExerciseIds));
      if (templateLinks.length > 0) {
        await db.insert(schema.exerciseLinks).values(
          templateLinks.map((l) => ({
            exerciseId: oldToNewExerciseId[l.exerciseId]!,
            label: l.label,
            url: l.url,
          }))
        );
      }
      console.log(`Copied ${templateLinks.length} tutorial links`);
    }
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
