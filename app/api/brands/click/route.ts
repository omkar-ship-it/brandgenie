import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { brandClicks, brands } from "@/lib/db/schema";
import { dayKey } from "@/lib/rules";

/**
 * Counts someone opening a brand's card from the board — the engagement
 * number a brand is buying a position for.
 *
 * Two writes: the lifetime total on the brand, and a per-day row so a brand
 * can see the shape of a day rather than one ever-growing number.
 *
 * Deliberately cheap and anonymous: no session required, nothing recorded
 * about who clicked. That also means it's only as honest as the visitor, so
 * treat it as a demo-grade signal, not a billable metric. If it ever backs
 * pricing, give the per-day row a session id so repeats can be collapsed.
 */
export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ ok: false }, { status: 503 });

  const body = await req.json().catch(() => null);
  const brandId = typeof body?.brandId === "string" ? body.brandId : "";
  if (!/^[0-9a-f-]{36}$/i.test(brandId)) {
    return NextResponse.json({ error: "Unknown brand." }, { status: 400 });
  }

  await db
    .update(brands)
    .set({ clicks: sql`${brands.clicks} + 1` })
    .where(eq(brands.id, brandId));

  await db
    .insert(brandClicks)
    .values({ brandId, dayKey: dayKey(), count: 1 })
    .onConflictDoUpdate({
      target: [brandClicks.brandId, brandClicks.dayKey],
      set: { count: sql`${brandClicks.count} + 1` },
    });

  return NextResponse.json({ ok: true });
}
