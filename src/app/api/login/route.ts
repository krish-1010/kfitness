import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/session";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = body?.password;

  const expected = process.env.APP_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!expected || !secret) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  if (password !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const cookieValue = await createSessionCookie(secret, THIRTY_DAYS_MS);
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
