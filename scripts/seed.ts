import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const FOODS = [
  { name: "Whey scoop (30g)", protein: 30, kcal: 120 },
  { name: "Whole egg", protein: 6, kcal: 78 },
  { name: "Egg white", protein: 3.5, kcal: 17 },
  { name: "Soy chunks 100g dry", protein: 52, kcal: 345 },
  { name: "Paneer 100g", protein: 18, kcal: 265 },
  { name: "Dal 1 cup cooked", protein: 16, kcal: 230 },
  { name: "Sprouts 1 cup", protein: 14, kcal: 150 },
  { name: "Milk 1 glass", protein: 8, kcal: 150 },
  { name: "Curd 1 cup", protein: 7, kcal: 150 },
  { name: "Chicken breast 100g", protein: 27, kcal: 165 },
  { name: "Fish 100g", protein: 21, kcal: 140 },
  { name: "Peanuts 30g", protein: 7, kcal: 170 },
  { name: "Chole 1 cup", protein: 15, kcal: 270 },
  { name: "Tofu 100g", protein: 8, kcal: 145 },
  { name: "Rajma 1 cup", protein: 15, kcal: 245 },
  { name: "Greek yogurt 1 cup", protein: 20, kcal: 150 },
  { name: "Cottage cheese 100g", protein: 11, kcal: 98 },
  { name: "Almonds 30g", protein: 6, kcal: 175 },
  { name: "Moong dal 1 cup cooked", protein: 14, kcal: 210 },
  { name: "Besan chilla (2)", protein: 12, kcal: 220 },
  { name: "Quinoa 1 cup cooked", protein: 8, kcal: 220 },
  { name: "Prawns 100g", protein: 24, kcal: 99 },
  { name: "Mutton 100g", protein: 25, kcal: 250 },
  { name: "Sattu 30g", protein: 7, kcal: 110 },
  { name: "Peanut butter 2 tbsp", protein: 8, kcal: 190 },
  { name: "Boiled chickpeas 1 cup", protein: 15, kcal: 270 },
  { name: "Edamame 1 cup", protein: 17, kcal: 190 },
  { name: "Idli (2)", protein: 4, kcal: 120 },
  { name: "Sambar 1 cup", protein: 6, kcal: 150 },
  { name: "Oats 1 cup cooked", protein: 6, kcal: 150 },
];

const EXERCISES: { name: string; dayType: "Push" | "Pull" | "Legs"; defaultSets: number; defaultReps: string }[] = [
  { name: "Bench press", dayType: "Push", defaultSets: 4, defaultReps: "6-10" },
  { name: "Overhead press", dayType: "Push", defaultSets: 3, defaultReps: "8-12" },
  { name: "Incline dumbbell press", dayType: "Push", defaultSets: 3, defaultReps: "8-12" },
  { name: "Lateral raise", dayType: "Push", defaultSets: 3, defaultReps: "12-15" },
  { name: "Tricep pushdown", dayType: "Push", defaultSets: 3, defaultReps: "10-15" },
  { name: "Dips", dayType: "Push", defaultSets: 3, defaultReps: "8-12" },

  { name: "Deadlift", dayType: "Pull", defaultSets: 3, defaultReps: "5-8" },
  { name: "Pull-up", dayType: "Pull", defaultSets: 4, defaultReps: "6-10" },
  { name: "Barbell row", dayType: "Pull", defaultSets: 4, defaultReps: "8-12" },
  { name: "Lat pulldown", dayType: "Pull", defaultSets: 3, defaultReps: "10-12" },
  { name: "Face pull", dayType: "Pull", defaultSets: 3, defaultReps: "12-15" },
  { name: "Barbell curl", dayType: "Pull", defaultSets: 3, defaultReps: "8-12" },

  { name: "Squat", dayType: "Legs", defaultSets: 4, defaultReps: "6-10" },
  { name: "Romanian deadlift", dayType: "Legs", defaultSets: 3, defaultReps: "8-12" },
  { name: "Leg press", dayType: "Legs", defaultSets: 3, defaultReps: "10-12" },
  { name: "Walking lunge", dayType: "Legs", defaultSets: 3, defaultReps: "10-12/leg" },
  { name: "Leg curl", dayType: "Legs", defaultSets: 3, defaultReps: "10-15" },
  { name: "Calf raise", dayType: "Legs", defaultSets: 4, defaultReps: "12-20" },
];

async function seed() {
  const existingFoods = await db.select().from(schema.foods);
  if (existingFoods.length === 0) {
    await db.insert(schema.foods).values(FOODS);
    console.log(`Seeded ${FOODS.length} foods`);
  } else {
    console.log(`Skipped foods seed — ${existingFoods.length} rows already exist`);
  }

  const existingExercises = await db.select().from(schema.exercises);
  if (existingExercises.length === 0) {
    await db.insert(schema.exercises).values(EXERCISES);
    console.log(`Seeded ${EXERCISES.length} exercises`);
  } else {
    console.log(`Skipped exercises seed — ${existingExercises.length} rows already exist`);
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
