import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { randomInt, randomBytes } from "crypto";
import { db, hasDb } from "@/lib/db";
import { grants, plays, rewards } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { getBoard } from "@/lib/board";
import { dayKey, genieStart, WALK_MAX_STEPS, WALK_MIN_STEPS } from "@/lib/rules";

/**
 * The whole round is resolved here, not in the browser: the client only
 * animates what the server already decided, so a player can't pick where
 * the genie stops or replay the day.
 */
export async function POST() {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to play." }, { status: 401 });

  const key = dayKey();
  const [existing] = await db
    .select()
    .from(plays)
    .where(and(eq(plays.userId, user.id), eq(plays.dayKey, key)))
    .limit(1);
  if (existing) {
    return NextResponse.json({ error: "You've already had your round today." }, { status: 409 });
  }

  const board = await getBoard();
  const claimed = board.length;
  if (claimed === 0) {
    return NextResponse.json({ error: "No brands on the board yet." }, { status: 409 });
  }

  const start = genieStart(key, claimed);
  let steps = randomInt(WALK_MIN_STEPS, WALK_MAX_STEPS + 1);

  // He won't settle on a brand with nothing left to give — he keeps walking.
  const hasStock = (position: number) => {
    const entry = board[position - 1];
    return Boolean(entry?.rewardId && entry.remaining > 0);
  };
  let landed = ((start - 1 + steps) % claimed) + 1;
  for (let guard = 0; guard < claimed && !hasStock(landed); guard++) {
    steps++;
    landed = ((start - 1 + steps) % claimed) + 1;
  }

  const entry = board[landed - 1];
  if (!entry?.rewardId || entry.remaining <= 0) {
    await db.insert(plays).values({ userId: user.id, dayKey: key, landedPosition: landed, steps });
    return NextResponse.json({ ok: true, start, steps, landed, prize: null });
  }

  // Only decrement while stock actually remains, so two simultaneous rounds
  // can't push a reward below zero.
  const updated = await db
    .update(rewards)
    .set({ remaining: sql`${rewards.remaining} - 1` })
    .where(and(eq(rewards.id, entry.rewardId), sql`${rewards.remaining} > 0`))
    .returning();

  if (updated.length === 0) {
    await db.insert(plays).values({ userId: user.id, dayKey: key, landedPosition: landed, steps });
    return NextResponse.json({ ok: true, start, steps, landed, prize: null });
  }

  const code = randomBytes(4).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + entry.validDays * 24 * 60 * 60 * 1000);
  const [grant] = await db
    .insert(grants)
    .values({
      code,
      userId: user.id,
      brandId: entry.brandId,
      brandName: entry.name,
      label: entry.rewardLabel!,
      icon: entry.rewardIcon,
      expiresAt,
    })
    .returning();

  await db.insert(plays).values({
    userId: user.id,
    dayKey: key,
    landedPosition: landed,
    steps,
    brandId: entry.brandId,
    grantId: grant.id,
  });

  return NextResponse.json({
    ok: true,
    start,
    steps,
    landed,
    prize: {
      code: grant.code,
      label: grant.label,
      icon: grant.icon,
      brandName: grant.brandName,
      expiresAt: grant.expiresAt.toISOString(),
    },
  });
}
