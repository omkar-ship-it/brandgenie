import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { couponCodes, rewards } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/board";

const MAX_BATCH = 2000;

/** Unclaimed codes are the live stock; keep the reward's counters in step. */
async function resync(rewardId: string) {
  if (!db) return { total: 0, unused: 0 };
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      unused: sql<number>`count(*) filter (where ${couponCodes.assignedGrantId} is null)::int`,
    })
    .from(couponCodes)
    .where(eq(couponCodes.rewardId, rewardId));

  const total = Number(row?.total ?? 0);
  const unused = Number(row?.unused ?? 0);
  await db.update(rewards).set({ totalStock: total, remaining: unused }).where(eq(rewards.id, rewardId));
  return { total, unused };
}

export async function GET() {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const owned = await getBrandForUser(user.id);
  if (!owned?.reward) return NextResponse.json({ total: 0, unused: 0 });
  return NextResponse.json(await resync(owned.reward.id));
}

/**
 * Paste a batch of the brand's own single-use discount codes, one per line.
 * Duplicates within the batch and against what's already stored are dropped
 * rather than rejected, so re-pasting a list top-up is safe.
 */
export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const owned = await getBrandForUser(user.id);
  if (!owned?.reward) return NextResponse.json({ error: "Save your reward first." }, { status: 400 });
  if (owned.reward.redemptionType !== "online") {
    return NextResponse.json({ error: "Codes are only for online rewards." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const raw = typeof body?.codes === "string" ? body.codes : "";
  const codes: string[] = Array.from(
    new Set<string>(
      raw
        .split(/[\s,]+/)
        .map((c: string) => c.trim().toUpperCase())
        .filter((c: string) => c.length >= 3 && c.length <= 64)
    )
  ).slice(0, MAX_BATCH);

  if (codes.length === 0) {
    return NextResponse.json({ error: "Paste your codes, one per line." }, { status: 400 });
  }

  await db
    .insert(couponCodes)
    .values(codes.map((code) => ({ rewardId: owned.reward!.id, code })))
    .onConflictDoNothing();

  const counts = await resync(owned.reward.id);
  return NextResponse.json({ ok: true, added: codes.length, ...counts });
}

/** Clears codes nobody has been given yet. Claimed ones are never touched. */
export async function DELETE() {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const owned = await getBrandForUser(user.id);
  if (!owned?.reward) return NextResponse.json({ error: "No reward yet." }, { status: 400 });

  await db
    .delete(couponCodes)
    .where(and(eq(couponCodes.rewardId, owned.reward.id), isNull(couponCodes.assignedGrantId)));

  return NextResponse.json({ ok: true, ...(await resync(owned.reward.id)) });
}
