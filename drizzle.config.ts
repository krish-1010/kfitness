import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit's own env loader only reads `.env`, not `.env.local` — Next.js's
// convention. Load it explicitly here instead of relying on drizzle-kit's
// implicit (and different) dotenv behavior.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

export default defineConfig({
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
});
