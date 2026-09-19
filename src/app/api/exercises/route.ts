import { NextRequest, NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { exercises } from "@/lib/schema";
import { getLinkCounts } from "@/lib/exerciseLinks";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const dayType = req.nextUrl.searchParams.get("dayType");
  const variant = req.nextUrl.searchParams.get("variant");
  const conditions = [eq(exercises.userId, userId), eq(exercises.archived, false)];
  if (dayType) conditions.push(eq(exercises.dayType, dayType));
  // 'standard' variant exercises (e.g. core) always show alongside whichever
  // strength/hypertrophy variant is active for that day type.
  if (variant) {
    conditions.push(
      or(eq(exercises.variant, variant), eq(exercises.variant, "standard"))!
    );
  }

  const rows = await db
    .select()
    .from(exercises)
    .where(and(...conditions));

  const linkCounts = await getLinkCounts(rows.map((r) => r.id));
  return NextResponse.json(rows.map((r) => ({ ...r, linkCount: linkCounts[r.id] ?? 0 })));
}

export async function POST(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const body = await req.json();
  const { name, dayType, defaultSets, defaultReps, restSeconds, variant, block, muscleGroup, trackingType } = body ?? {};

  if (!name || !dayType || !["Push", "Pull", "Legs"].includes(dayType)) {
    return NextResponse.json(
      { error: "name and dayType (Push/Pull/Legs) are required" },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(exercises)
    .values({
      userId,
      name,
      dayType,
      defaultSets: typeof defaultSets === "number" ? defaultSets : 3,
      defaultReps: defaultReps || "8-12",
      restSeconds: typeof restSeconds === "number" ? restSeconds : null,
      variant: variant || "standard",
      block: block || "main",
      muscleGroup: typeof muscleGroup === "string" ? muscleGroup : "",
      trackingType: ["reps_weight", "duration_distance"].includes(trackingType) ? trackingType : "reps_weight",
    })
    .returning();

  return NextResponse.json({ ...row, linkCount: 0 }, { status: 201 });
}
