import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const SUPPLEMENTS = [
  { name: "Supradyn Daily", time: "AM · with food (alternate days)" },
  { name: "Zincovit", time: "AM · with food (alternate days)" },
  { name: "Carbamide Forte D3+K2", time: "AM · with food" },
  { name: "HK Vitals Magnesium Glycinate (2 tab)", time: "PM · before bed" },
  { name: "TrueBasics Whey (1 scoop, 30g)", time: "Post-workout" },
  { name: "AS-IT-IS Creatine (5g)", time: "Anytime" },
];

async function seed() {
  const existing = await db.select().from(schema.supplements);
  if (existing.length > 0) {
    console.log(`Skipped — ${existing.length} supplements already exist. Delete/archive manually first if you want to replace them.`);
    return;
  }
  await db.insert(schema.supplements).values(SUPPLEMENTS);
  console.log(`Seeded ${SUPPLEMENTS.length} supplements`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
