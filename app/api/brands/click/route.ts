import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { brands } from "@/lib/db/schema";

/**
 * Counts someone opening a brand's card from the board — the engagement
 * number a brand is buying a position for.
 *
 * Deliberately cheap and anonymous: no session required, nothing recorded
 * about who clicked. That also means it's only as honest as the visitor, so
 * treat it as a demo-grade signal, not a billable metric. If it ever backs
 * pricing, move it to a `brand_views` table with a session and a timestamp so
 * repeats can be collapsed.
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

  return NextResponse.json({ ok: true });
}
