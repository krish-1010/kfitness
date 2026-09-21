import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";
import { deleteUserData } from "@/lib/deleteUserData";

// Account info for the Profile page — email + display name.
export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const [user] = await db.select({ email: users.email, displayName: users.displayName }).from(users).where(eq(users.id, userId));
  return NextResponse.json(user ?? null);
}

// PATCH /api/me { displayName } -> updates the current user's display name.
export async function PATCH(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const body = await req.json().catch(() => null);
  const displayName = body?.displayName;
  if (typeof displayName !== "string") {
    return NextResponse.json({ error: "displayName is required" }, { status: 400 });
  }
  await db.update(users).set({ displayName }).where(eq(users.id, userId));
  return NextResponse.json({ ok: true });
}

// DELETE /api/me -> permanently deletes the current user's account and all
// owned data (see deleteUserData for exactly what that covers), then clears
// the session cookie so the now-deleted account is immediately logged out.
export async function DELETE(req: NextRequest) {
  const userId = getCurrentUserId(req);
  await deleteUserData(userId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("ct_session", "", { maxAge: 0, path: "/" });
  return res;
}
