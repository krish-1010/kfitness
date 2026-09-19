import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/session";
import { authenticateUser } from "@/lib/auth";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const userId = await authenticateUser(email, password);
  if (userId === null) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const cookieValue = await createSessionCookie(secret, userId, THIRTY_DAYS_MS);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("ct_session", cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: THIRTY_DAYS_MS / 1000,
    path: "/",
  });
  return res;
}
