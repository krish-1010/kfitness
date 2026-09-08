import { pgTable, serial, text, real, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";

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
    date: text("date").notNull(),
    supplementId: text("supplement_id").notNull(),
    done: boolean("done").notNull().default(true),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.date, t.supplementId] }),
  })
);

// One row per date (matches the original weights array, deduped by date on write).
export const weights = pgTable("weights", {
  date: text("date").primaryKey(),
  weight: real("weight").notNull(),
});
