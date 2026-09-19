import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "./db";
import { users } from "./schema";

// Single choke point for "is this email/password a valid login" — kept
// separate from the route handler so swapping in a Google OAuth check
// later (passwordHash is already nullable for exactly this) only touches
// this function, not the login route, middleware, or session logic.
export async function authenticateUser(email: string, password: string): Promise<number | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !user.passwordHash) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user.id : null;
}

// Reads the userId middleware.ts verified and attached to every request
// that reaches a route handler. Every route under this auth wall can
// assume this is present and already trustworthy — middleware overwrites
// whatever a client sends under this header name, so it can't be spoofed.
export function getCurrentUserId(req: NextRequest): number {
  const raw = req.headers.get("x-user-id");
  const userId = Number(raw);
  if (!raw || !Number.isInteger(userId)) {
    // Should be unreachable — middleware redirects to /login before any
    // route handler runs without a verified session. A thrown error here
    // surfaces a real bug (e.g. a route outside the middleware matcher)
    // rather than silently querying as no one / everyone.
    throw new Error("No verified user on request — middleware should have redirected to /login");
  }
  return userId;
}
