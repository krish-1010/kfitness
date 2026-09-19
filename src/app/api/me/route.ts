import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

// Read-only account info for the Profile page — email + display name.
export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const [user] = await db.select({ email: users.email, displayName: users.displayName }).from(users).where(eq(users.id, userId));
  return NextResponse.json(user ?? null);
}
