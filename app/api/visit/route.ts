import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { visits } from "@/lib/db/schema";
import { dayKey } from "@/lib/rules";

const COOKIE = "bg_vid";
const YEAR = 365 * 24 * 60 * 60;

/**
 * Records that somebody was here today, and hands back the running counts.
 *
 * The unique index on (visitor_id, day_key) does the de-duplication, so
 * twenty page views from one person in one day stay one visit. That matters
 * because the number is shown publicly: a page-view counter dressed up as
 * visitors is a number that flatters itself.
 *
 * No IP, no fingerprint — a random id in a first-party cookie the visitor
 * can clear.
 */
export async function POST() {
  if (!hasDb || !db) return NextResponse.json({ today: 0, total: 0 });

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

  await db.insert(visits).values({ visitorId: vid, dayKey: dayKey() }).onConflictDoNothing();

  const [row] = await db
    .select({
      today: sql<number>`count(*) filter (where ${visits.dayKey} = ${dayKey()})::int`,
      total: sql<number>`count(distinct ${visits.visitorId})::int`,
    })
    .from(visits);

  return NextResponse.json({ today: Number(row?.today ?? 0), total: Number(row?.total ?? 0) });
}
