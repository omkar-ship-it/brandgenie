import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, hasDb } from "./db";
import { brandClicks, grants } from "./db/schema";
import { dayKey } from "./rules";

export type DayRow = {
  day: string;
  clicks: number;
  won: number;
  redeemed: number;
};

export type BrandStats = {
  today: DayRow;
  days: DayRow[];
  totals: { clicks: number; won: number; redeemed: number; gifted: number };
};

const EMPTY_DAY = (day: string): DayRow => ({ day, clicks: 0, won: 0, redeemed: 0 });

/**
 * A brand's own numbers, by day.
 *
 * Three separate counts rather than one joined query: clicks live in their
 * own per-day table, while "won" and "redeemed" are the same grant counted
 * on two different dates — a reward won on Monday and redeemed on Friday
 * belongs to both days, and joining would double-count it.
 */
export async function getBrandStats(brandId: string, days = 7): Promise<BrandStats> {
  const today = dayKey();
  const window: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    window.push(dayKey(new Date(Date.now() - i * 86_400_000)));
  }
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = new Map(window.map((d) => [d, EMPTY_DAY(d)]));

  if (hasDb && db) {
    const clickRows = await db
      .select({ day: brandClicks.dayKey, count: brandClicks.count })
      .from(brandClicks)
      .where(and(eq(brandClicks.brandId, brandId), gte(brandClicks.dayKey, window[0])));
    for (const r of clickRows) {
      const row = rows.get(r.day);
      if (row) row.clicks = r.count;
    }

    const wonRows = await db
      .select({ day: sql<string>`to_char(${grants.createdAt} + interval '330 minutes', 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` })
      .from(grants)
      .where(and(eq(grants.brandId, brandId), gte(grants.createdAt, since)))
      .groupBy(sql`1`);
    for (const r of wonRows) {
      const row = rows.get(r.day);
      if (row) row.won = Number(r.n);
    }

    const redeemedRows = await db
      .select({ day: sql<string>`to_char(${grants.redeemedAt} + interval '330 minutes', 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` })
      .from(grants)
      .where(and(eq(grants.brandId, brandId), gte(grants.redeemedAt, since)))
      .groupBy(sql`1`);
    for (const r of redeemedRows) {
      const row = rows.get(r.day);
      if (row) row.redeemed = Number(r.n);
    }
  }

  const totals = { clicks: 0, won: 0, redeemed: 0, gifted: 0 };
  if (hasDb && db) {
    const [t] = await db
      .select({
        won: sql<number>`count(*)::int`,
        redeemed: sql<number>`count(*) filter (where ${grants.status} = 'redeemed')::int`,
        gifted: sql<number>`count(*) filter (where ${grants.giftedByUserId} is not null)::int`,
      })
      .from(grants)
      .where(eq(grants.brandId, brandId));
    const [c] = await db
      .select({ clicks: sql<number>`coalesce(sum(${brandClicks.count}), 0)::int` })
      .from(brandClicks)
      .where(eq(brandClicks.brandId, brandId));
    totals.won = Number(t?.won ?? 0);
    totals.redeemed = Number(t?.redeemed ?? 0);
    totals.gifted = Number(t?.gifted ?? 0);
    totals.clicks = Number(c?.clicks ?? 0);
  }

  return {
    today: rows.get(today) ?? EMPTY_DAY(today),
    days: window.map((d) => rows.get(d)!),
    totals,
  };
}

/** The most recent codes handed out, for a brand checking what's in the wild. */
export async function getRecentGrants(brandId: string, limit = 8) {
  if (!hasDb || !db) return [];
  return db
    .select({
      code: grants.code,
      status: grants.status,
      createdAt: grants.createdAt,
      redeemedAt: grants.redeemedAt,
      expiresAt: grants.expiresAt,
    })
    .from(grants)
    .where(eq(grants.brandId, brandId))
    .orderBy(desc(grants.createdAt))
    .limit(limit);
}
