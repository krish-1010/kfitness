import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
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
};

const PROGRAM: Seed[] = [
  // Push — Strength
  { name: "Barbell Bench Press", dayType: "Push", defaultSets: 4, defaultReps: "6-8", restSeconds: 90, variant: "strength" },
  { name: "Machine Shoulder Press", dayType: "Push", defaultSets: 3, defaultReps: "8-10", restSeconds: 75, variant: "strength" },
  { name: "Pec Deck Fly", dayType: "Push", defaultSets: 3, defaultReps: "10-12", restSeconds: 60, variant: "strength" },
  { name: "DB Lateral Raises", dayType: "Push", defaultSets: 3, defaultReps: "12-15", restSeconds: 45, variant: "strength" },
  { name: "Tricep Pushdowns (cable)", dayType: "Push", defaultSets: 3, defaultReps: "10-12", restSeconds: 45, variant: "strength" },
  { name: "DB Overhead Tricep Extension", dayType: "Push", defaultSets: 3, defaultReps: "10-12", restSeconds: 45, variant: "strength" },

  // Pull — Strength
  { name: "Lat Pulldown", dayType: "Pull", defaultSets: 4, defaultReps: "6-8", restSeconds: 90, variant: "strength" },
  { name: "Seated Cable Row", dayType: "Pull", defaultSets: 4, defaultReps: "8-10", restSeconds: 75, variant: "strength" },
  { name: "DB Single-Arm Row", dayType: "Pull", defaultSets: 3, defaultReps: "10-12", restSeconds: 60, variant: "strength" },
  { name: "DB Bicep Curls", dayType: "Pull", defaultSets: 3, defaultReps: "10-12", restSeconds: 45, variant: "strength" },
  { name: "DB Hammer Curls", dayType: "Pull", defaultSets: 3, defaultReps: "10-12", restSeconds: 45, variant: "strength" },
  { name: "Machine Wrist Curls", dayType: "Pull", defaultSets: 3, defaultReps: "15", restSeconds: 30, variant: "strength" },

  // Legs — Strength
  { name: "Smith Machine Squat", dayType: "Legs", defaultSets: 4, defaultReps: "6-8", restSeconds: 120, variant: "strength" },
  { name: "Leg Press", dayType: "Legs", defaultSets: 3, defaultReps: "8-10", restSeconds: 90, variant: "strength" },
  { name: "DB Romanian Deadlift", dayType: "Legs", defaultSets: 3, defaultReps: "8-10", restSeconds: 90, variant: "strength" },
  { name: "Leg Curl", dayType: "Legs", defaultSets: 3, defaultReps: "10-12", restSeconds: 60, variant: "strength" },
  { name: "Leg Extension", dayType: "Legs", defaultSets: 3, defaultReps: "12-15", restSeconds: 45, variant: "strength" },
  { name: "Calf Raises", dayType: "Legs", defaultSets: 4, defaultReps: "15-20", restSeconds: 30, variant: "strength" },

  // Push — Hypertrophy
  { name: "Machine Chest Press", dayType: "Push", defaultSets: 4, defaultReps: "12-15", restSeconds: 60, variant: "hypertrophy" },
  { name: "Incline DB Press", dayType: "Push", defaultSets: 3, defaultReps: "10-12", restSeconds: 60, variant: "hypertrophy" },
  { name: "DB Front Raises", dayType: "Push", defaultSets: 3, defaultReps: "15", restSeconds: 45, variant: "hypertrophy" },
  { name: "Pec Deck Fly (Hyper)", dayType: "Push", defaultSets: 3, defaultReps: "15", restSeconds: 45, variant: "hypertrophy" },
  { name: "Tricep Pushdowns (Hyper)", dayType: "Push", defaultSets: 3, defaultReps: "15", restSeconds: 30, variant: "hypertrophy" },
  { name: "Both-Arm DB Extension", dayType: "Push", defaultSets: 3, defaultReps: "15", restSeconds: 30, variant: "hypertrophy" },

  // Pull — Hypertrophy
  { name: "Seated Cable Row (Hyper)", dayType: "Pull", defaultSets: 4, defaultReps: "12-15", restSeconds: 60, variant: "hypertrophy" },
  { name: "Lat Pulldown (Hyper)", dayType: "Pull", defaultSets: 3, defaultReps: "12-15", restSeconds: 60, variant: "hypertrophy" },
  { name: "DB Single-Arm Row (Hyper)", dayType: "Pull", defaultSets: 3, defaultReps: "12-15", restSeconds: 45, variant: "hypertrophy" },
  { name: "DB Bicep Curls (Hyper)", dayType: "Pull", defaultSets: 3, defaultReps: "15", restSeconds: 30, variant: "hypertrophy" },
  { name: "DB Hammer Curls (Hyper)", dayType: "Pull", defaultSets: 3, defaultReps: "15", restSeconds: 30, variant: "hypertrophy" },
  { name: "Machine Wrist Curls (Hyper)", dayType: "Pull", defaultSets: 3, defaultReps: "15-20", restSeconds: 30, variant: "hypertrophy" },

  // Legs — Hypertrophy
  { name: "Leg Press (Hyper)", dayType: "Legs", defaultSets: 4, defaultReps: "12-15", restSeconds: 75, variant: "hypertrophy" },
  { name: "Smith Machine Squat (Hyper)", dayType: "Legs", defaultSets: 3, defaultReps: "10-12", restSeconds: 75, variant: "hypertrophy" },
  { name: "Leg Extension (Hyper)", dayType: "Legs", defaultSets: 3, defaultReps: "15", restSeconds: 45, variant: "hypertrophy" },
  { name: "Leg Curl (Hyper)", dayType: "Legs", defaultSets: 3, defaultReps: "15", restSeconds: 45, variant: "hypertrophy" },
  { name: "DB Romanian Deadlift (Hyper)", dayType: "Legs", defaultSets: 3, defaultReps: "12", restSeconds: 60, variant: "hypertrophy" },
  { name: "Calf Raises (Hyper)", dayType: "Legs", defaultSets: 4, defaultReps: "20", restSeconds: 30, variant: "hypertrophy" },

  // Core — attached to Pull, 'standard' variant so it shows on BOTH Pull
  // passes (2x/week), not gated to just strength or hypertrophy.
  { name: "Plank", dayType: "Pull", defaultSets: 3, defaultReps: "30 sec", restSeconds: 25, variant: "standard", block: "core" },
  { name: "Leg Raises", dayType: "Pull", defaultSets: 3, defaultReps: "15", restSeconds: 25, variant: "standard", block: "core" },
  { name: "Pelvic Bridges", dayType: "Pull", defaultSets: 3, defaultReps: "15", restSeconds: 25, variant: "standard", block: "core" },

  // Conditioning — attached to Pull-Hypertrophy only (the lighter session),
  // replacing that day's steady-state cardio, once a week.
  { name: "Jumping Jacks", dayType: "Pull", defaultSets: 3, defaultReps: "15", restSeconds: 45, variant: "hypertrophy", block: "conditioning" },
  { name: "High Knees", dayType: "Pull", defaultSets: 3, defaultReps: "15", restSeconds: 45, variant: "hypertrophy", block: "conditioning" },
  { name: "Buttkicks", dayType: "Pull", defaultSets: 3, defaultReps: "15", restSeconds: 45, variant: "hypertrophy", block: "conditioning" },
  { name: "Step-ups", dayType: "Pull", defaultSets: 3, defaultReps: "15", restSeconds: 45, variant: "hypertrophy", block: "conditioning" },
  { name: "Mountain Climbers", dayType: "Pull", defaultSets: 3, defaultReps: "15", restSeconds: 45, variant: "hypertrophy", block: "conditioning" },
  { name: "Inch Worm", dayType: "Pull", defaultSets: 3, defaultReps: "15", restSeconds: 45, variant: "hypertrophy", block: "conditioning" },
];

async function run() {
  // Archive whatever's currently in the library (the old generic starter
  // set) rather than deleting — exercise_log rows reference exerciseId
  // directly, so archiving keeps any already-logged history resolvable.
  const existing = await db.select().from(schema.exercises).where(eq(schema.exercises.archived, false));
  if (existing.length > 0) {
    await db.update(schema.exercises).set({ archived: true }).where(eq(schema.exercises.archived, false));
    console.log(`Archived ${existing.length} existing exercises`);
  }

  await db.insert(schema.exercises).values(
    PROGRAM.map((p) => ({
      name: p.name,
      dayType: p.dayType,
      defaultSets: p.defaultSets,
      defaultReps: p.defaultReps,
      restSeconds: p.restSeconds,
      variant: p.variant,
      block: p.block ?? "main",
    }))
  );
  console.log(`Seeded ${PROGRAM.length} exercises (confirmed PPL x2 program + core + conditioning)`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
