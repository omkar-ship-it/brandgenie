import { and, eq, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "./db";
import { couponCodes, grants, plays, rewards } from "./db/schema";
import type { BoardEntry } from "./board";

export type RoundMode = "classic" | "pick" | "stop";
export const MODES: RoundMode[] = ["classic", "pick", "stop"];
export const isMode = (v: unknown): v is RoundMode => MODES.includes(v as RoundMode);

export type AwardResult = {
  prize: null | {
    code: string;
    label: string;
    icon: string;
    brandName: string;
    redemptionType: string;
    couponCode: string | null;
    expiresAt: string;
  };
};

/** Has this player already had their round in this mode today? */
export async function alreadyPlayed(userId: string, dayKey: string, mode: RoundMode) {
  if (!db) return false;
  const [row] = await db
    .select({ id: plays.id })
    .from(plays)
    .where(and(eq(plays.userId, userId), eq(plays.dayKey, dayKey), eq(plays.mode, mode)))
    .limit(1);
  return Boolean(row);
}

/** A brand can only be landed on if it still has something to give. */
export function hasStock(entry: BoardEntry | undefined) {
  return Boolean(entry?.rewardId && entry.remaining > 0);
}

/**
 * Hand over whatever the landed brand is giving, and record the round.
 *
 * Every board variant funnels through here, so stock decrements, coupon
 * claiming and the one-round-a-day record behave identically however the
 * player arrived at a position — the experiment is about the mechanic, not
 * about three subtly different award paths.
 */
export async function awardLanding(opts: {
  userId: string;
  dayKey: string;
  mode: RoundMode;
  steps: number;
  landed: number;
  entry: BoardEntry | undefined;
}): Promise<AwardResult> {
  const { userId, dayKey, mode, steps, landed, entry } = opts;
  if (!db) return { prize: null };

  const recordOnly = async () => {
    await db!.insert(plays).values({ userId, dayKey, mode, landedPosition: landed, steps });
    return { prize: null };
  };

  if (!entry?.rewardId || entry.remaining <= 0) return recordOnly();

  // Only decrement while stock actually remains, so two simultaneous rounds
  // can't push a reward below zero.
  const updated = await db
    .update(rewards)
    .set({ remaining: sql`${rewards.remaining} - 1` })
    .where(and(eq(rewards.id, entry.rewardId), sql`${rewards.remaining} > 0`))
    .returning();
  if (updated.length === 0) return recordOnly();

  // For an online reward the brand's coupon batch is the real stock. Claim
  // one with a conditional update so two simultaneous rounds can't be handed
  // the same code; if the batch is empty the decrement above is given back.
  let couponCode: string | null = null;
  let claimedCouponId: string | null = null;
  if (entry.redemptionType === "online") {
    const [claimed] = await db
      .update(couponCodes)
      .set({ assignedAt: new Date() })
      .where(
        and(
          eq(couponCodes.rewardId, entry.rewardId),
          sql`${couponCodes.id} = (
            select id from coupon_codes
            where reward_id = ${entry.rewardId} and assigned_grant_id is null
            order by created_at limit 1 for update skip locked
          )`
        )
      )
      .returning();

    if (!claimed) {
      await db
        .update(rewards)
        .set({ remaining: sql`${rewards.remaining} + 1` })
        .where(eq(rewards.id, entry.rewardId));
      return recordOnly();
    }
    couponCode = claimed.code;
    claimedCouponId = claimed.id;
  }

  const code = randomBytes(4).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + entry.validDays * 24 * 60 * 60 * 1000);
  const [grant] = await db
    .insert(grants)
    .values({
      code,
      userId,
      brandId: entry.brandId,
      brandName: entry.name,
      label: entry.rewardLabel!,
      icon: entry.rewardIcon,
      // Snapshotted so a brand editing their listing can't change what
      // someone already holds.
      redemptionType: entry.redemptionType,
      instructions: entry.instructions,
      redeemUrl: entry.redeemUrl,
      couponCode,
      expiresAt,
    })
    .returning();

  if (claimedCouponId) {
    await db.update(couponCodes).set({ assignedGrantId: grant.id }).where(eq(couponCodes.id, claimedCouponId));
  }

  await db.insert(plays).values({
    userId,
    dayKey,
    mode,
    landedPosition: landed,
    steps,
    brandId: entry.brandId,
    grantId: grant.id,
  });

  return {
    prize: {
      code: grant.code,
      label: grant.label,
      icon: grant.icon,
      brandName: grant.brandName,
      redemptionType: grant.redemptionType,
      couponCode: grant.couponCode,
      expiresAt: grant.expiresAt.toISOString(),
    },
  };
}

/**
 * What a signed-out player would have won. No code, because none was
 * issued — the preview never touches stock or grants.
 */
export function previewPrize(entry: BoardEntry | undefined) {
  if (!entry?.rewardLabel) return null;
  return {
    code: "",
    label: entry.rewardLabel,
    icon: entry.rewardIcon,
    brandName: entry.name,
    redemptionType: entry.redemptionType,
    couponCode: null,
    expiresAt: new Date(Date.now() + entry.validDays * 86_400_000).toISOString(),
  };
}
