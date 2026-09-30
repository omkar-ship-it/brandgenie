import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { interestSignals } from "@/lib/db/schema";
import { isInterestModule } from "@/lib/interest";

const COOKIE = "bg_vid";
const YEAR = 365 * 24 * 60 * 60;

/**
 * "I'd use this" for something that doesn't exist yet — Brand Corner or
 * Brand Drops, both concept previews. Shipping the pages before the games
 * or the unlock logic are real only makes sense if clicking this button
 * means something afterward, so this is the one piece of actual backend
 * either module has.
 *
 * Reuses the same first-party visitor cookie the public visit counter
 * does (see app/api/visit), so a dozen clicks from one person show up as
 * one signal rather than inflating the count shown right next to it — and
 * so a repeat visitor sees "you're in" instead of a live button that does
 * nothing on a second click.
 */
export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const body = await req.json().catch(() => null);
  const mod = body?.module;
  const targetSlug = typeof body?.targetSlug === "string" ? body.targetSlug.trim().slice(0, 80) : "";
  if (!isInterestModule(mod) || !targetSlug) {
    return NextResponse.json({ error: "Unknown module." }, { status: 400 });
  }

  const store = await cookies();
  let vid = store.get(COOKIE)?.value;
  if (!vid || !/^[0-9a-f-]{36}$/i.test(vid)) {
    vid = randomUUID();
    store.set(COOKIE, vid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: YEAR,
    });
  }

  await db.insert(interestSignals).values({ module: mod, targetSlug, visitorId: vid }).onConflictDoNothing();

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(interestSignals)
    .where(and(eq(interestSignals.module, mod), eq(interestSignals.targetSlug, targetSlug)));

  return NextResponse.json({ ok: true, count });
}
