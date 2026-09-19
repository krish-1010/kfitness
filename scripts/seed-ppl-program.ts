import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import * as schema from "../src/lib/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

type Seed = {
  name: string;
  dayType: "Push" | "Pull" | "Legs";
  defaultSets: number;
  defaultReps: string;
  restSeconds: number;
  variant: "strength" | "hypertrophy" | "standard";
  block?: "main" | "core" | "conditioning";
  muscleGroup: string;
  // Intentionally left null for the whole seed — real demo video links need
  // to be sourced and verified per exercise, not guessed. Add them via the
  // "Manage exercise library" panel in the app, or ask for a batch to be
  // researched separately.
  videoUrl?: null;
};

const PROGRAM: Seed[] = [
  // Push — Strength
  { name: "Push-ups (warm-up)", dayType: "Push", defaultSets: 2, defaultReps: "5-6", restSeconds: 60, variant: "strength", muscleGroup: "Chest · Mid" },
  { name: "Barbell Bench Press", dayType: "Push", defaultSets: 4, defaultReps: "6-8", restSeconds: 180, variant: "strength", muscleGroup: "Chest · Mid" },
  { name: "Machine Shoulder Press", dayType: "Push", defaultSets: 3, defaultReps: "8-10", restSeconds: 75, variant: "strength", muscleGroup: "Shoulders · Front" },
  { name: "Pec Deck Fly", dayType: "Push", defaultSets: 3, defaultReps: "10-12", restSeconds: 60, variant: "strength", muscleGroup: "Chest · Mid" },
  { name: "DB Lateral Raises", dayType: "Push", defaultSets: 3, defaultReps: "12-15", restSeconds: 45, variant: "strength", muscleGroup: "Shoulders · Side" },
  { name: "Tricep Pushdowns (cable)", dayType: "Push", defaultSets: 3, defaultReps: "10-12", restSeconds: 45, variant: "strength", muscleGroup: "Triceps · Lateral" },
  { name: "DB Overhead Tricep Extension", dayType: "Push", defaultSets: 3, defaultReps: "10-12", restSeconds: 45, variant: "strength", muscleGroup: "Triceps · Long Head" },

  // Push — Hypertrophy
  { name: "Machine Chest Press", dayType: "Push", defaultSets: 4, defaultReps: "12-15", restSeconds: 60, variant: "hypertrophy", muscleGroup: "Chest · Mid" },
  { name: "Incline DB Press", dayType: "Push", defaultSets: 3, defaultReps: "10-12", restSeconds: 60, variant: "hypertrophy", muscleGroup: "Chest · Upper" },
  { name: "DB Front Raises", dayType: "Push", defaultSets: 3, defaultReps: "15", restSeconds: 45, variant: "hypertrophy", muscleGroup: "Shoulders · Front" },
  { name: "Pec Deck Fly (Hyper)", dayType: "Push", defaultSets: 3, defaultReps: "15", restSeconds: 45, variant: "hypertrophy", muscleGroup: "Chest · Mid" },
  { name: "Tricep Pushdowns (Hyper)", dayType: "Push", defaultSets: 3, defaultReps: "15", restSeconds: 30, variant: "hypertrophy", muscleGroup: "Triceps · Lateral" },
  { name: "Both-Arm DB Extension", dayType: "Push", defaultSets: 3, defaultReps: "15", restSeconds: 30, variant: "hypertrophy", muscleGroup: "Triceps · Long Head" },
  { name: "Cable Crossover (Low-to-High)", dayType: "Push", defaultSets: 3, defaultReps: "12-15", restSeconds: 45, variant: "hypertrophy", muscleGroup: "Chest · Lower/Inner" },
  { name: "Push-ups (AMRAP)", dayType: "Push", defaultSets: 1, defaultReps: "AMRAP", restSeconds: 0, variant: "hypertrophy", muscleGroup: "Chest · Mid" },

  // Pull — Strength. Assisted pull-ups over lat pulldown for movement
  // specificity — log the assistance level (kg) in the weight field, the
  // milestone is that number going DOWN to 0, not up.
  { name: "Assisted Pull-ups", dayType: "Pull", defaultSets: 4, defaultReps: "6-8", restSeconds: 150, variant: "strength", muscleGroup: "Back · Lats" },
  { name: "Seated Cable Row", dayType: "Pull", defaultSets: 4, defaultReps: "8-10", restSeconds: 75, variant: "strength", muscleGroup: "Back · Mid/Thickness" },
  { name: "DB Single-Arm Row", dayType: "Pull", defaultSets: 3, defaultReps: "10-12", restSeconds: 60, variant: "strength", muscleGroup: "Back · Mid/Thickness" },
  { name: "DB Bicep Curls", dayType: "Pull", defaultSets: 3, defaultReps: "10-12", restSeconds: 45, variant: "strength", muscleGroup: "Biceps" },
  { name: "DB Hammer Curls", dayType: "Pull", defaultSets: 3, defaultReps: "10-12", restSeconds: 45, variant: "strength", muscleGroup: "Biceps · Brachialis" },
  { name: "Machine Wrist Curls", dayType: "Pull", defaultSets: 3, defaultReps: "15", restSeconds: 30, variant: "strength", muscleGroup: "Forearms" },
  { name: "Face Pulls", dayType: "Pull", defaultSets: 3, defaultReps: "12-15", restSeconds: 45, variant: "strength", muscleGroup: "Shoulders · Rear" },

  // Pull — Strength, core block (kept off the hypertrophy pass since that
  // one already carries the full conditioning circuit)
  { name: "Plank", dayType: "Pull", defaultSets: 3, defaultReps: "30 sec", restSeconds: 25, variant: "strength", block: "core", muscleGroup: "Core · Anterior" },
  { name: "Leg Raises", dayType: "Pull", defaultSets: 3, defaultReps: "15", restSeconds: 25, variant: "strength", block: "core", muscleGroup: "Core · Anterior" },
  { name: "Pelvic Bridges", dayType: "Pull", defaultSets: 3, defaultReps: "15", restSeconds: 25, variant: "strength", block: "core", muscleGroup: "Core · Posterior/Glutes" },
  { name: "45-Degree Back Extension", dayType: "Pull", defaultSets: 3, defaultReps: "15", restSeconds: 25, variant: "strength", block: "core", muscleGroup: "Lower Back · Erectors" },

  // Pull — Hypertrophy
  { name: "Seated Cable Row (Hyper)", dayType: "Pull", defaultSets: 4, defaultReps: "12-15", restSeconds: 60, variant: "hypertrophy", muscleGroup: "Back · Mid/Thickness" },
  { name: "Assisted Pull-ups (Hyper)", dayType: "Pull", defaultSets: 3, defaultReps: "12-15", restSeconds: 60, variant: "hypertrophy", muscleGroup: "Back · Lats" },
  { name: "DB Single-Arm Row (Hyper)", dayType: "Pull", defaultSets: 3, defaultReps: "12-15", restSeconds: 45, variant: "hypertrophy", muscleGroup: "Back · Mid/Thickness" },
  { name: "DB Bicep Curls (Hyper)", dayType: "Pull", defaultSets: 3, defaultReps: "15", restSeconds: 30, variant: "hypertrophy", muscleGroup: "Biceps" },
  { name: "DB Hammer Curls (Hyper)", dayType: "Pull", defaultSets: 3, defaultReps: "15", restSeconds: 30, variant: "hypertrophy", muscleGroup: "Biceps · Brachialis" },
  { name: "Machine Wrist Curls (Hyper)", dayType: "Pull", defaultSets: 3, defaultReps: "15-20", restSeconds: 30, variant: "hypertrophy", muscleGroup: "Forearms" },
  { name: "DB Shrugs", dayType: "Pull", defaultSets: 3, defaultReps: "12-15", restSeconds: 45, variant: "hypertrophy", muscleGroup: "Traps" },

  // Pull — Hypertrophy, conditioning block (replaces steady-state cardio
  // that day only, once a week). A single incline walk instead of the
  // original 6-move circuit, since PT sessions are already endurance-heavy.
  { name: "Incline Treadmill Walk", dayType: "Pull", defaultSets: 1, defaultReps: "15 min", restSeconds: 0, variant: "hypertrophy", block: "conditioning", muscleGroup: "Full Body · Conditioning" },

  // Legs — Strength
  { name: "Smith Machine Squat", dayType: "Legs", defaultSets: 4, defaultReps: "6-8", restSeconds: 120, variant: "strength", muscleGroup: "Quads" },
  { name: "Leg Press", dayType: "Legs", defaultSets: 3, defaultReps: "8-10", restSeconds: 90, variant: "strength", muscleGroup: "Quads" },
  { name: "DB Romanian Deadlift", dayType: "Legs", defaultSets: 3, defaultReps: "8-10", restSeconds: 90, variant: "strength", muscleGroup: "Hamstrings" },
  { name: "Leg Curl", dayType: "Legs", defaultSets: 3, defaultReps: "10-12", restSeconds: 60, variant: "strength", muscleGroup: "Hamstrings" },
  { name: "Leg Extension", dayType: "Legs", defaultSets: 3, defaultReps: "12-15", restSeconds: 45, variant: "strength", muscleGroup: "Quads" },
  { name: "Calf Raises", dayType: "Legs", defaultSets: 4, defaultReps: "15-20", restSeconds: 30, variant: "strength", muscleGroup: "Calves" },

  // Legs — Hypertrophy
  { name: "Leg Press (Hyper)", dayType: "Legs", defaultSets: 4, defaultReps: "12-15", restSeconds: 75, variant: "hypertrophy", muscleGroup: "Quads" },
  { name: "Smith Machine Squat (Hyper)", dayType: "Legs", defaultSets: 3, defaultReps: "10-12", restSeconds: 75, variant: "hypertrophy", muscleGroup: "Quads" },
  { name: "Leg Extension (Hyper)", dayType: "Legs", defaultSets: 3, defaultReps: "15", restSeconds: 45, variant: "hypertrophy", muscleGroup: "Quads" },
  { name: "Leg Curl (Hyper)", dayType: "Legs", defaultSets: 3, defaultReps: "15", restSeconds: 45, variant: "hypertrophy", muscleGroup: "Hamstrings" },
  { name: "DB Romanian Deadlift (Hyper)", dayType: "Legs", defaultSets: 3, defaultReps: "12", restSeconds: 60, variant: "hypertrophy", muscleGroup: "Hamstrings" },
  { name: "Calf Raises (Hyper)", dayType: "Legs", defaultSets: 4, defaultReps: "20", restSeconds: 30, variant: "hypertrophy", muscleGroup: "Calves" },

  // Legs — both passes. [Assumption] your gym has a hip adduction/abduction
  // machine — wasn't on the original card or confirmed separately. If it
  // doesn't, swap these for banded lateral walks or cable hip adduction.
  { name: "Hip Adduction Machine", dayType: "Legs", defaultSets: 3, defaultReps: "15", restSeconds: 45, variant: "standard", muscleGroup: "Adductors" },
  { name: "Hip Abduction Machine", dayType: "Legs", defaultSets: 3, defaultReps: "15", restSeconds: 45, variant: "standard", muscleGroup: "Abductors" },
];

// Legacy one-time script for the original account. New accounts are
// onboarded via scripts/create-user.ts, which copies the current live
// exercise library instead of re-running this.
const ORIGINAL_USER_ID = 1;

async function run() {
  // Archive whatever's currently in the library rather than deleting —
  // exercise_log rows reference exerciseId directly, so archiving keeps
  // any already-logged history resolvable.
  const existing = await db
    .select()
    .from(schema.exercises)
    .where(and(eq(schema.exercises.userId, ORIGINAL_USER_ID), eq(schema.exercises.archived, false)));
  if (existing.length > 0) {
    await db
      .update(schema.exercises)
      .set({ archived: true })
      .where(and(eq(schema.exercises.userId, ORIGINAL_USER_ID), eq(schema.exercises.archived, false)));
    console.log(`Archived ${existing.length} existing exercises`);
  }

  await db.insert(schema.exercises).values(
    PROGRAM.map((p) => ({
      userId: ORIGINAL_USER_ID,
      name: p.name,
      dayType: p.dayType,
      defaultSets: p.defaultSets,
      defaultReps: p.defaultReps,
      restSeconds: p.restSeconds,
      variant: p.variant,
      block: p.block ?? "main",
      muscleGroup: p.muscleGroup,
    }))
  );
  console.log(`Seeded ${PROGRAM.length} exercises (full muscle-coverage PPL x2 program)`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
