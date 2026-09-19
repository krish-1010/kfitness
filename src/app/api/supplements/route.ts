import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { supplements } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const rows = await db.select().from(supplements).where(and(eq(supplements.userId, userId), eq(supplements.archived, false)));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const body = await req.json();
  const { name, time } = body ?? {};

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const [row] = await db
    .insert(supplements)
    .values({ userId, name, time: typeof time === "string" ? time : "" })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
