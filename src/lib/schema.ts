import { pgTable, serial, text, real, boolean, integer, timestamp, unique } from "drizzle-orm/pg-core";

// 2-5 known people, accounts created by running scripts/create-user.ts --
// no public signup. passwordHash is nullable so a future Google-OAuth-only
// user (see src/lib/auth.ts) never needs one; adding real OAuth later only
// touches that one function, not this table or every route.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// One row per food item logged on a given date.
// `date` stays a plain YYYY-MM-DD string to match the original app's date handling exactly.
export const logItems = pgTable("log_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
  name: text("name").notNull(),
  protein: real("protein").notNull(),
  kcal: real("kcal").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// One row per (user, date, supplement) triple, only written when toggled true.
// Absence of a row = not done, matching the original `log.supplements[id]` boolean map.
// Uses a surrogate id + unique constraint rather than a composite primary
// key — drizzle-kit push has a known bug (drizzle-team/drizzle-orm #4471)
// where it repeatedly, incorrectly tries to drop/recreate composite PK
// constraints and fails against Postgres. A unique constraint gives the
// same "no duplicate row per user/day/supplement" guarantee without hitting it.
export const supplementLog = pgTable(
  "supplement_log",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    date: text("date").notNull(),
    supplementId: text("supplement_id").notNull(),
    done: boolean("done").notNull().default(true),
  },
  (t) => ({
    userDateSupplementUnique: unique().on(t.userId, t.date, t.supplementId),
  })
);

// User-editable supplement list. Each user gets their own private copy,
// seeded from the same defaults, on account creation (see
// scripts/create-user.ts). supplementLog.supplementId stores this table's
// id as text (the column's existing type), so no column type change was
// needed on supplement_log to make this switch from a hardcoded list.
export const supplements = pgTable("supplements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  time: text("time").notNull().default(""),
  archived: boolean("archived").notNull().default(false),
});

// One row per (user, date) — same composite-PK-bug workaround as
// supplementLog above (surrogate id + unique constraint instead of a
// natural-key primary key, which is what `date` alone used to be before
// multiple users each needed their own row for the same date).
export const weights = pgTable(
  "weights",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    date: text("date").notNull(),
    weight: real("weight").notNull(),
  },
  (t) => ({
    userDateUnique: unique().on(t.userId, t.date),
  })
);

// A user's training split, e.g. "PPL" or "5-Day Upper/Lower/etc". A user
// can have several (a cut split and a bulk split, say); exactly one is
// `isActive` at a time, which is what the app actually cycles through day
// to day. `fixedRestWeekday` (0=Sunday..6=Saturday) replaces the old
// hardcoded "Sunday defaults to Rest" rule — now per-plan, since a 5-day
// plan might want that too, or might want pure continuous cycling with no
// calendar anchor at all (null).
export const workoutPlans = pgTable("workout_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  fixedRestWeekday: integer("fixed_rest_weekday"),
  archived: boolean("archived").notNull().default(false),
});

// One row per day-slot in a plan's cycle, in `dayIndex` order (0-based).
// `label` is free text ("Push", "Day 1", "Chest + Shoulders") — this is
// what makes the split arbitrary instead of hardcoded to PPL.
// `variantMode`: 'none' cycles through this day once per lap with no
// alternation; 'strength_hypertrophy' alternates two passes each time this
// slot comes up (the PPL x2 pattern), same skip-tolerant mechanism as
// before, just generalized off dayIndex instead of a fixed 3-array.
export const planDays = pgTable(
  "plan_days",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id").notNull(),
    dayIndex: integer("day_index").notNull(),
    label: text("label").notNull(),
    variantMode: text("variant_mode").notNull().default("none"),
  },
  (t) => ({
    planDayIndexUnique: unique().on(t.planId, t.dayIndex),
  })
);

// User-editable exercise library. Each user gets their own private copy,
// seeded from the same defaults, on account creation.
export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  planDayId: integer("plan_day_id").notNull(),
  defaultSets: integer("default_sets").notNull().default(3),
  defaultReps: text("default_reps").notNull().default("8-12"),
  restSeconds: integer("rest_seconds"),
  // 'strength' | 'hypertrophy' — which pass this belongs to, only relevant
  // when the parent plan_day's variantMode is 'strength_hypertrophy'.
  // 'standard' means it shows on every session for its plan_day regardless
  // of which pass is active (core/conditioning add-ons that aren't part of
  // the alternation) — also the only meaningful value for a plan_day whose
  // variantMode is 'none'.
  variant: text("variant").notNull().default("standard"),
  // 'main' | 'core' | 'conditioning' — groups exercises within a session
  // for display, independent of the strength/hypertrophy variant.
  block: text("block").notNull().default("main"),
  muscleGroup: text("muscle_group").notNull().default(""),
  // 'reps_weight' (the default — sets x reps x weight) or 'duration_distance'
  // (treadmill, rowing, a run — each set logs time and/or distance instead).
  // Determines which input fields exerciseSetLog rows show for this exercise.
  trackingType: text("tracking_type").notNull().default("reps_weight"),
  archived: boolean("archived").notNull().default(false),
});

// Tutorial/demo links for an exercise. No userId of its own — ownership is
// inherited through exerciseId (every route reaches this table only after
// already confirming the parent exercise belongs to the current user).
// exerciseId isn't a DB foreign key, same convention as exerciseLog, so
// archiving an exercise never orphans a delete cascade.
export const exerciseLinks = pgTable("exercise_links", {
  id: serial("id").primaryKey(),
  exerciseId: integer("exercise_id").notNull(),
  label: text("label").notNull().default(""),
  url: text("url").notNull(),
});

// One row per (user, date) once a plan day is decided (suggested or
// overridden) or a session is completed/skipped/rested. Absence of a row
// means "not decided yet" — the frontend computes a suggestion in that case.
// planDayId null means Rest; a non-null value identifies which plan_days
// row (and therefore which plan) that date was trained under, so switching
// active plans later never breaks the meaning of past sessions.
export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    date: text("date").notNull(),
    planDayId: integer("plan_day_id"),
    status: text("status").notNull().default("planned"), // 'planned' | 'done' | 'skipped' | 'rest'
    isManualOverride: boolean("is_manual_override").notNull().default(false),
  },
  (t) => ({
    userDateUnique: unique().on(t.userId, t.date),
  })
);

// One row per exercise performed (or planned) within a session. `sets` is
// the target/default set count used only when first creating the row (to
// know how many exerciseSetLog rows to pre-create) — actual per-set data
// (reps/weight, or duration/distance) lives in exerciseSetLog below.
export const exerciseLog = pgTable("exercise_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
  exerciseId: integer("exercise_id").notNull(),
  sets: integer("sets"),
  done: boolean("done").notNull().default(false),
});

// One row per individual set within a logged exercise, so each set carries
// its own values instead of one shared reps/weight for the whole exercise
// (e.g. 8 reps @ 60kg, then 6 reps @ 65kg). weight is `real` (float) — 7.5kg
// etc. is already representable. For duration_distance exercises (treadmill,
// a run) reps/weight stay null and durationSeconds/distanceMeters are used
// instead; which pair applies is read off the parent exercise's
// trackingType. No userId of its own — inherited through exerciseLogId,
// same convention as exerciseLinks above.
export const exerciseSetLog = pgTable("exercise_set_log", {
  id: serial("id").primaryKey(),
  exerciseLogId: integer("exercise_log_id").notNull(),
  setNumber: integer("set_number").notNull(),
  reps: text("reps"),
  weight: real("weight"),
  durationSeconds: integer("duration_seconds"),
  distanceMeters: real("distance_meters"),
  done: boolean("done").notNull().default(false),
});

// User-editable food library. Each user gets their own private copy,
// seeded from the same defaults, on account creation. logItems stores
// name/protein/kcal directly (not a foreign key to this table), so
// archiving or editing a food never touches past logged days.
export const foods = pgTable("foods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  protein: real("protein").notNull(),
  kcal: real("kcal").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
});

// One row per water log event. Multiple per day, unlike weight — you drink
// water repeatedly through the day, so this sums rather than overwrites.
export const waterLog = pgTable("water_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
  amountMl: integer("amount_ml").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Generic per-user key/value app settings (currently just water_target_ml).
// Same composite-PK-bug workaround as weights/workoutSessions above.
export const settings = pgTable(
  "settings",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
  },
  (t) => ({
    userKeyUnique: unique().on(t.userId, t.key),
  })
);
