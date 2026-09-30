import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { db, hasDb } from "./db";
import { brands, rewards, votes } from "./db/schema";
import { BOARD_SIZE } from "./rules";

export type BoardEntry = {
  position: number;
  brandId: string;
  name: string;
  tagline: string;
  category: string;
  area: string;
  website: string | null;
  instagram: string | null;
  logoUrl: string | null;
  bidPaise: number;
  clicks: number;
  voteCount: number;
  /** Whether the customer asking for this board has already voted here. */
  votedByMe: boolean;
  rewardId: string | null;
  rewardLabel: string | null;
  rewardIcon: string;
  redemptionType: string;
  instructions: string;
  redeemUrl: string | null;
  remaining: number;
  validDays: number;
};

/**
 * The board is the paid listings in order — most customer votes first, ties
 * to whoever joined first. Positions are derived here and never stored, so a
 * vote landing re-ranks everyone with no gaps.
 *
 * Paying the listing fee makes a brand *eligible*; it no longer buys a
 * position outright. A brand can sit unranked for a long time with zero
 * votes while a newer, better-supported brand sits above it.
 *
 * `demo` picks which board you get: the real one customers play, or the
 * showcase the comparison pages run on. The two never mix, so a full /try
 * board says nothing about who is actually paying for a position.
 *
 * `voterId`, when given, marks which entries that specific customer has
 * already voted for — so a signed-in customer sees "Voted" instead of a live
 * button without a second round trip.
 */
export async function getBoard(demo = false, voterId?: string): Promise<BoardEntry[]> {
  if (!hasDb || !db) return [];

  // Reused in both the select and the orderBy so the two can never disagree
  // about what "vote count" means. A correlated subquery rather than a join
  // + group by: the board is capped at a few dozen visible rows, so running
  // it once per candidate brand costs nothing next to a join that would
  // otherwise fan out one row per vote.
  const voteCountExpr = sql<number>`(select count(*)::int from ${votes} where ${votes.brandId} = ${brands.id})`;
  const votedByMeExpr = voterId
    ? sql<boolean>`exists (select 1 from ${votes} v2 where v2.brand_id = ${brands.id} and v2.voter_id = ${voterId})`
    : sql<boolean>`false`;

  const rows = await db
    .select({
      brandId: brands.id,
      name: brands.name,
      tagline: brands.tagline,
      category: brands.category,
      area: brands.area,
      website: brands.website,
      instagram: brands.instagram,
      logoUrl: brands.logoUrl,
      bidPaise: brands.bidPaise,
      clicks: brands.clicks,
      voteCount: voteCountExpr,
      votedByMe: votedByMeExpr,
      rewardId: rewards.id,
      rewardLabel: rewards.label,
      rewardIcon: rewards.icon,
      redemptionType: rewards.redemptionType,
      instructions: rewards.instructions,
      redeemUrl: rewards.redeemUrl,
      remaining: rewards.remaining,
      validDays: rewards.validDays,
    })
    .from(brands)
    .leftJoin(rewards, eq(rewards.brandId, brands.id))
    .where(and(gt(brands.bidPaise, 0), eq(brands.isDemo, demo)))
    .orderBy(desc(voteCountExpr), asc(brands.bidAt))
    .limit(BOARD_SIZE);

  return rows.map((r, i) => ({
    position: i + 1,
    brandId: r.brandId,
    name: r.name,
    tagline: r.tagline,
    category: r.category,
    area: r.area,
    website: r.website,
    instagram: r.instagram,
    logoUrl: r.logoUrl,
    bidPaise: r.bidPaise,
    clicks: r.clicks,
    voteCount: r.voteCount,
    votedByMe: r.votedByMe,
    rewardId: r.rewardId,
    rewardLabel: r.rewardLabel,
    rewardIcon: r.rewardIcon ?? "🎁",
    redemptionType: r.redemptionType ?? "counter",
    instructions: r.instructions ?? "",
    redeemUrl: r.redeemUrl,
    remaining: r.remaining ?? 0,
    validDays: r.validDays ?? 14,
  }));
}

export async function getBrandForUser(userId: string) {
  if (!hasDb || !db) return null;
  const [brand] = await db.select().from(brands).where(eq(brands.userId, userId)).limit(1);
  if (!brand) return null;
  const [reward] = await db
    .select()
    .from(rewards)
    .where(and(eq(rewards.brandId, brand.id)))
    .limit(1);
  return { brand, reward: reward ?? null };
}
