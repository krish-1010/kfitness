import { pgTable, serial, text, real, boolean, integer, timestamp, unique } from "drizzle-orm/pg-core";

// One row per food item logged on a given date.
// `date` stays a plain YYYY-MM-DD string to match the original app's date handling exactly.
export const logItems = pgTable("log_items", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  name: text("name").notNull(),
  protein: real("protein").notNull(),
  kcal: real("kcal").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// One row per (date, supplement) pair, only written when toggled true.
// Absence of a row = not done, matching the original `log.supplements[id]` boolean map.
export const supplementLog = pgTable(
  "supplement_log",
  {
    id: serial("id").primaryKey(),
    date: text("date").notNull(),
    supplementId: text("supplement_id").notNull(),
    done: boolean("done").notNull().default(true),
  },
  (t) => ({
    dateSupplementUnique: unique().on(t.date, t.supplementId),
  })
);

// One row per date (matches the original weights array, deduped by date on write).
export const weights = pgTable("weights", {
  date: text("date").primaryKey(),
  weight: real("weight").notNull(),
});

// User-editable exercise library. Replaces a hardcoded constant so exercises
// can be added/edited from the UI without a redeploy.
export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dayType: text("day_type").notNull(), // 'Push' | 'Pull' | 'Legs'
  defaultSets: integer("default_sets").notNull().default(3),
  defaultReps: text("default_reps").notNull().default("8-12"),
  archived: boolean("archived").notNull().default(false),
});

// One row per date once a day type is decided (suggested or overridden) or
// a session is completed/skipped/rested. Absence of a row for a date means
// "not decided yet" — the frontend computes a suggestion in that case.
export const workoutSessions = pgTable("workout_sessions", {
  date: text("date").primaryKey(),
  dayType: text("day_type").notNull(), // 'Push' | 'Pull' | 'Legs' | 'Rest'
  status: text("status").notNull().default("planned"), // 'planned' | 'done' | 'skipped' | 'rest'
  isManualOverride: boolean("is_manual_override").notNull().default(false),
});

// One row per exercise performed (or planned) within a session.
export const exerciseLog = pgTable("exercise_log", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  exerciseId: integer("exercise_id").notNull(),
  sets: integer("sets"),
  reps: text("reps"),
  weight: real("weight"),
  done: boolean("done").notNull().default(false),
});

// User-editable food library. Replaces the hardcoded FOOD_LIBRARY constant.
// logItems stores name/protein/kcal directly (not a foreign key to this
// table), so archiving or editing a food never touches past logged days.
export const foods = pgTable("foods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  protein: real("protein").notNull(),
  kcal: real("kcal").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
});
