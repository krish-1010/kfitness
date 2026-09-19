import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/schema";

// GET /api/settings?key=water_target_ml -> { value: string | null }
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key query param required" }, { status: 400 });
  }

  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return NextResponse.json({ value: row?.value ?? null });
}

// PATCH /api/settings { key, value } -> upsert
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { key, value } = body ?? {};

  if (!key || typeof value !== "string") {
    return NextResponse.json({ error: "key and string value are required" }, { status: 400 });
  }

  const existing = await db.select().from(settings).where(eq(settings.key, key));
  if (existing.length > 0) {
    await db.update(settings).set({ value }).where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value });
  }

  return NextResponse.json({ ok: true });
}
