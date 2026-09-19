# Cut Tracker — Handoff Document

**Purpose:** carry full context into a new chat session. This app has been built entirely across one long conversation; this doc is the memory that conversation isn't around to provide anymore.

## What this is

A personal workout/nutrition tracker (Push/Pull/Legs split, food/protein/kcal logging, supplements, water, weight) originally built for one person, now being converted into a small multi-user app for 2-5 known people.

- **Live URL:** https://fitkr.vercel.app
- **Repo:** https://github.com/krish-1010/kfitness (git remote `origin`, branch `main`)
- **Local path:** `D:\Downloads\cut-tracker\cut-tracker`
- **Stack:** Next.js 16 (App Router, Turbopack), Drizzle ORM, Neon Postgres (free tier), Vercel (Hobby plan), deployed via GitHub integration (push to `main` auto-deploys)
- **Vercel project:** `kfitness`, team `krish1010's projects` (`team_iuSvQvsXGU9g87a3CKMNDuvK`), project id `prj_ZcG47ndYlLafWKwWkXlQDe8s7QVO`
- **Current login:** email `mkrishna.inbox@gmail.com`, password `krishna` (user id 1 in the `users` table — this is the original account, migrated from the old single-password system)

## Available tooling worth knowing about

- **Vercel MCP tools** (`mcp__5fb6986b-...__*`) are connected — use `list_deployments`, `get_deployment`, `get_runtime_errors` to check deployment status and errors directly rather than asking the user. Don't need to guess deployment state.
- **Neon DB access**: no special MCP tool needed — just run throwaway Node scripts using `DATABASE_URL` from `.env.local` (via `@neondatabase/serverless`'s `neon()` tagged-template function). This is how every migration in this project has been run. Pattern:
  ```js
  import { config } from "dotenv";
  config({ path: ".env.local" });
  import { neon } from "@neondatabase/serverless";
  const sql = neon(process.env.DATABASE_URL);
  await sql`...`;
  ```
  Write to `scripts/_tmp-*.mjs`, run with `node`, then delete — never commit these.
- **Neon skills** are installed at `.claude/skills/neon` and `.claude/skills/neon-postgres` (from `npx neon@latest skills`) — mostly just guidance docs, not required for the DB-access pattern above.
- **gh CLI** is installed and authenticated as `krish-1010`.
- Browser preview tools (`preview_start`, `computer`, etc.) work for local smoke-testing.

## Critical gotchas — read before touching auth or the DB

1. **`next dev` does NOT enforce `middleware.ts`.** This was discovered and confirmed as a real bug/limitation in this Next 16.3.4 + Turbopack (and even `--webpack`) combo — requests sail through with no auth check at all in dev mode, regardless of cookies. **Production (`next build && next start`, and real Vercel deploys) enforces it correctly.** Any auth-related change MUST be verified via `next build && npm run start -- -p <port>` locally against the real DB before trusting it, not `npm run dev`.

2. **`drizzle-kit push` is unreliable on this project** — it has hit multiple confirmed bugs (drizzle-team/drizzle-orm #4471 and others) around composite primary keys, corrupting migrations repeatedly early in this project's history. **Never use `npm run db:push`.** All schema changes are applied via raw SQL run directly against Neon using the pattern above, then `src/lib/schema.ts` is updated to match by hand. Tables that need a "natural key" uniqueness (e.g., one row per user per date) use a surrogate `serial id` primary key + a `unique()` constraint instead of a composite primary key, specifically to avoid this bug (see `weights`, `workoutSessions`, `settings`, `supplementLog` in schema.ts).

3. **Verification loop for every change** (established throughout, don't skip steps):
   - `npx tsc --noEmit` (typecheck)
   - `rm -rf .next && npm run build` (full build)
   - For UI changes: `preview_start` + browser tools, smoke-test the actual feature
   - For auth/middleware changes: `next start` locally + `curl` to verify unauthenticated vs authenticated behavior against the real DB
   - `git add -A -- ':!.env.local' ':!.next'` (never commit `.env.local`), commit, push
   - Check Vercel deployment reaches `READY` via `get_deployment`, then `get_runtime_errors` for a clean window, before considering it done

4. **`react-muscle-highlighter`** (npm package) powers the muscle diagrams. It has no sub-muscle-head distinction (triceps lateral vs long head both light up the same "triceps" region) and no dedicated abductors region (mapped to "gluteal" as closest fit). Mapping logic is in `src/lib/muscleSlug.ts`.

## Architecture map

- `src/lib/schema.ts` — every Drizzle table. Read this first when touching data.
- `src/lib/auth.ts` — `authenticateUser(email, password)` (the one choke point for login checks — swapping in Google OAuth later only touches this function) and `getCurrentUserId(req)` (reads the `x-user-id` header middleware sets).
- `src/lib/session.ts` — signs/verifies the session cookie. Format: `${userId}.${expiresAtMs}.${hexHmacSig}`.
- `middleware.ts` — auth gate. Public paths (no auth required): `/login`, `/api/login`, `/manifest.webmanifest`, `/icon`, `/apple-icon`, `/sw.js` (PWA assets must stay public — browsers fetch them unauthenticated to decide whether to offer the install prompt). Everything else requires a valid `ct_session` cookie; on success, forwards the verified `userId` to route handlers via an `x-user-id` header (rebuilt server-side every request, so a client can never spoof it).
- `src/lib/rotation.ts` — the Push/Pull/Legs day-type and strength/hypertrophy variant resolution algorithm. Currently hardcoded to a 3-day PPL cycle — **this needs generalizing in Phase 3** to support arbitrary N-day user-defined plans.
- `src/lib/exerciseLinks.ts`, `src/lib/exerciseSetLog.ts` — batched helper queries (avoid N+1) for tutorial links and per-set data.
- `src/app/page.tsx` — the entire frontend UI in one large client component (~1600+ lines). Every feature's UI lives here: day log, exercise quick-add, muscle diagram, tutorial modal, food/exercise/supplement management panels, weight/water logging.
- `src/app/login/page.tsx` — login form (email + password).
- `scripts/create-user.ts` — **the real way to onboard a new person.** Usage: `npx tsx scripts/create-user.ts <email> <password> [displayName] [templateUserId]`. Creates the user, then copies the *current live* active foods/supplements/exercises from a template user (default: user 1) into the new account — so new users start with whatever's actually live today, not a hardcoded snapshot.
- `scripts/seed.ts`, `scripts/seed-ppl-program.ts`, `scripts/seed-supplements.ts` — legacy one-time scripts hardcoded to `userId = 1` (the original account). Not meant to run again; kept for history. Don't use these for onboarding new users — use `create-user.ts`.

## What's done (Phases 1 & 2 of the roadmap)

Full plan file lives at `C:\Users\krish\.claude\plans\1-i-should-be-foamy-engelbart.md` (Phases 3-5 are detailed there too, at outline level).

**Phase 1 — quick wins:**
- Per-set reps/weight logging (`exercise_set_log` table) — each set independently editable, not one shared reps/weight per exercise.
- `exercises.trackingType` (`'reps_weight' | 'duration_distance'`) — cardio-style exercises log duration/distance per set instead.
- PWA install support (manifest, generated icons via `next/og`, minimal no-op-caching service worker).
- Water intake target with a progress bar (generic `settings` key/value table).

**Phase 2 — multi-user foundation (just completed):**
- `users` table (email, nullable `passwordHash` for future OAuth-only accounts, displayName).
- Every user-owned table got a `userId` column: `foods`, `supplements`, `supplement_log`, `exercises`, `workout_sessions`, `exercise_log`, `log_items`, `weights`, `water_log`, `settings`. (`exercise_links` and `exercise_set_log` inherit ownership via their parent row instead — checked explicitly in the routes that touch them.)
- bcrypt password hashing, per-user login, session cookie now carries `userId`.
- **Every single API route** was updated to filter by the current user's `userId` — verified this doesn't leak cross-user by actually creating a second test account and confirming a cross-user mutation attempt silently no-ops rather than touching the other account's data.
- Original account's full history migrated onto a real user row (verified end-to-end before deploying: login, existing logged workout data, food list, all intact and correctly scoped).

**Important:** because the login mechanism's cookie format changed, anyone with an old session gets bounced to `/login` once and needs to log back in. This already happened for the primary account.

## What's NOT done yet (remaining roadmap)

**Phase 3 — Custom plan builder** (largest remaining phase, not started):
- `workout_plans` + `plan_days` tables to replace the hardcoded `CYCLE = [Push, Pull, Legs]` in `rotation.ts` — support arbitrary N-day user-defined splits with custom labels, not just PPL.
- `exercises.dayType` (fixed enum) → `exercises.planDayId` (points at a plan_days row).
- A proper researched canonical muscle taxonomy (draft list is in the plan file) to replace free-text `muscleGroup` strings — needs real research per the user's explicit ask ("look for proper muscle names, build the list even more").
- **Exercise alternatives** — user explicitly asked for this (e.g., Face Pulls ↔ Reverse Pec Deck Fly as interchangeable when a machine's unavailable). Planned as `exercises.alternativeGroupId` (nullable int, shared group = interchangeable) + a "⇄ swap" UI affordance.
- `exercises.priority` (int, lower = do first) for ordering a day's exercise list by fatigue-management logic (compounds before isolations).
- Custom-exercise creation form needs full parity with the manage-panel edit form (currently only asks name/sets/reps) — add muscle picker, rest, priority, tutorial links inline.
- `PROGRAM_SECTIONS` (hardcoded 6-tuple in `page.tsx` driving the "Full Program table" modal) needs to derive from the user's actual plan days instead.

**Phase 4 — Dashboard + Calendar** (not started):
- Dashboard: 7/30-day rolling protein/kcal averages, weight trend slope, workout consistency streak, supplement adherence streak, one computed "what to improve" line.
- Calendar: month grid colored by daily goal-hit status, click a day to jump the existing date-based view to it.

**Phase 5 — Theming** (not started):
- Refactor hardcoded color constants in `page.tsx` (`ink`, `bg`, `amber`, etc.) into CSS custom properties, add a light theme + toggle (localStorage-persisted).

**Explicitly deferred by the user, not planned:** local-first IndexedDB storage with manual Google-Drive-style backup/sync (Obsidian-style). Flagged tension in the plan file: this pulls against the multi-user centralized-Postgres direction everything else is built toward — if picked up later, it likely wants to be an offline *cache* layer on top of Neon (PWA + background sync), not a replacement.

## Immediate next step

Two options were on the table when this handoff was written:
1. Start Phase 3 (custom plan builder) — the big one.
2. Add the other 1-4 users via `create-user.ts` first and live with multi-user for a bit before the plan builder changes the data model again.

No decision was made yet — ask the user which they'd rather do first.
