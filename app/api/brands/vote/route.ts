import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { brands, votes } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";

/**
 * A customer's upvote for a brand — what now moves a brand up and down the
 * board, in place of paying more.
 *
 * The unique index on (voter_id, brand_id) is the actual mechanism; the
 * check-then-insert here exists only to turn a duplicate vote into a clean
 * 409 rather than a raw constraint error, and `onConflictDoNothing` means a
 * genuine race between two clicks still can't produce two rows.
 */
export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to vote." }, { status: 401 });
  if (user.role === "merchant") {
    return NextResponse.json({ error: "Voting is for customers." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const brandId = typeof body?.brandId === "string" ? body.brandId : "";
  if (!/^[0-9a-f-]{36}$/i.test(brandId)) {
    return NextResponse.json({ error: "Unknown brand." }, { status: 400 });
  }

  const [brand] = await db.select({ id: brands.id }).from(brands).where(eq(brands.id, brandId)).limit(1);
  if (!brand) return NextResponse.json({ error: "Unknown brand." }, { status: 404 });

  const inserted = await db.insert(votes).values({ voterId: user.id, brandId }).onConflictDoNothing().returning();

  if (inserted.length === 0) {
    return NextResponse.json({ error: "You've already voted for this brand." }, { status: 409 });
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(votes)
    .where(eq(votes.brandId, brandId));

  return NextResponse.json({ ok: true, voteCount: count });
}
