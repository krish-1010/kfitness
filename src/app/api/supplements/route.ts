import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { supplements } from "@/lib/schema";

export async function GET() {
  const rows = await db.select().from(supplements).where(eq(supplements.archived, false));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, time } = body ?? {};

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const [row] = await db
    .insert(supplements)
    .values({ name, time: typeof time === "string" ? time : "" })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
