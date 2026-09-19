import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
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

  const templateExercises = await db
    .select()
    .from(schema.exercises)
    .where(and(eq(schema.exercises.userId, templateUserId), eq(schema.exercises.archived, false)));
  if (templateExercises.length > 0) {
    await db.insert(schema.exercises).values(
      templateExercises.map((e) => ({
        userId: user!.id,
        name: e.name,
        dayType: e.dayType,
        defaultSets: e.defaultSets,
        defaultReps: e.defaultReps,
        restSeconds: e.restSeconds,
        variant: e.variant,
        block: e.block,
        muscleGroup: e.muscleGroup,
        trackingType: e.trackingType,
      }))
    );
  }
  console.log(`Copied ${templateExercises.length} exercises from user ${templateUserId}`);
  console.log(
    "\nNote: tutorial links on the template's exercises were not copied (they'd need remapping to the new exercise ids) -- add them fresh via the app's manage panel if needed."
  );
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
