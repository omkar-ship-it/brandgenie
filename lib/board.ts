import { and, asc, desc, eq, gt } from "drizzle-orm";
import { db, hasDb } from "./db";
import { brands, rewards } from "./db/schema";
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
  rewardId: string | null;
  rewardLabel: string | null;
  rewardIcon: string;
  remaining: number;
  validDays: number;
};

/**
 * The board is just the paid bids in order — highest first, ties to whoever
 * got there first. Positions are derived here and never stored, so a bid
 * landing re-ranks everyone with no gaps.
 */
export async function getBoard(): Promise<BoardEntry[]> {
  if (!hasDb || !db) return [];

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
      rewardId: rewards.id,
      rewardLabel: rewards.label,
      rewardIcon: rewards.icon,
      remaining: rewards.remaining,
      validDays: rewards.validDays,
    })
    .from(brands)
    .leftJoin(rewards, eq(rewards.brandId, brands.id))
    .where(gt(brands.bidPaise, 0))
    .orderBy(desc(brands.bidPaise), asc(brands.bidAt))
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
    rewardId: r.rewardId,
    rewardLabel: r.rewardLabel,
    rewardIcon: r.rewardIcon ?? "🎁",
    remaining: r.remaining ?? 0,
    validDays: r.validDays ?? 14,
  }));
}

/** What it costs to take a given position: one step above whoever holds it. */
export function priceToBeat(entry: BoardEntry | undefined, step: number, base: number) {
  return entry ? entry.bidPaise + step : base;
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
