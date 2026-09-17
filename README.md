# Cut Tracker

Next.js port of the single-file React tracker. Same UI and logic, backed by
Postgres instead of `localStorage` so it syncs across devices and survives
browser data clears.

Stack: Next.js 16 (App Router) + Drizzle ORM + Neon Postgres (free, no
expiration) + Vercel Hobby (free, no expiration). Zero paid services, zero
services that get pruned or deleted for inactivity.

## 1. Create the database (5 min)

1. [neon.com](https://neon.com) → sign up (no card) → **New Project**.
2. Copy the **pooled** connection string from the dashboard.
3. Locally:
   ```bash
   cp .env.example .env.local
   # paste the connection string into DATABASE_URL
   # pick any password for APP_PASSWORD
   ```

## 2. Push the schema

```bash
npm install
npm run db:push
```

This creates `log_items`, `supplement_log`, and `weights` in Neon. No manual
SQL needed.

## 3. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000` — it redirects to `/login`. Enter
`APP_PASSWORD`. The session cookie stays valid for 30 days, no repeated
browser prompts.

## 4. Deploy (free, permanent)

1. Push this repo to GitHub.
2. [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. In **Environment Variables**, add `DATABASE_URL`, `APP_PASSWORD`, and
   `SESSION_SECRET`
   (same values as `.env.local`).
4. Deploy.

That's it — no server to keep alive, no free-tier database that expires in
90 days. Neon's free Postgres has no time limit; it just suspends compute
after 5 minutes idle and wakes in a few hundred ms on the next request.
Vercel Hobby is free indefinitely for personal, non-commercial projects.

## Why this replaces Render/Railway

The old flow (separate backend on Render/Railway) had a database with a
90-day free-tier expiry. Here there's no standalone backend service at all —
API routes are Next.js code deployed alongside the frontend as serverless
functions, and the database itself has a permanent free tier.

## Notes / trade-offs

- **Auth is intentionally minimal.** `middleware.ts` gates the whole app
  behind one shared password via HTTP Basic Auth — fine for a single-user
  tool, not meant to scale to multiple accounts. Swap for NextAuth if that
  changes; the schema doesn't need to.
- **Vercel Hobby forbids commercial use.** Fine here since this is personal.
- **Food library and supplement list are still hardcoded** in
  `src/lib/constants.ts`, same as the original. Move them into a table if
  you want to edit them without a redeploy.
