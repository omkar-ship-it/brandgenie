import { and, eq, sql } from "drizzle-orm";
import { db, hasDb } from "./db";
import { interestSignals } from "./db/schema";

export type InterestModule = "corner" | "drops";
export const INTEREST_MODULES: InterestModule[] = ["corner", "drops"];
export const isInterestModule = (v: unknown): v is InterestModule =>
  typeof v === "string" && (INTEREST_MODULES as string[]).includes(v);

/** Current interest count for every target in a module, keyed by slug. */
export async function getInterestCounts(module: InterestModule): Promise<Record<string, number>> {
  if (!hasDb || !db) return {};
  const rows = await db
    .select({ targetSlug: interestSignals.targetSlug, count: sql<number>`count(*)::int` })
    .from(interestSignals)
    .where(eq(interestSignals.module, module))
    .groupBy(interestSignals.targetSlug);
  return Object.fromEntries(rows.map((r) => [r.targetSlug, r.count]));
}

/** Which targets in a module this visitor has already signalled interest on. */
export async function getMyInterest(module: InterestModule, visitorId: string | undefined): Promise<Set<string>> {
  if (!hasDb || !db || !visitorId) return new Set();
  const rows = await db
    .select({ targetSlug: interestSignals.targetSlug })
    .from(interestSignals)
    .where(and(eq(interestSignals.module, module), eq(interestSignals.visitorId, visitorId)));
  return new Set(rows.map((r) => r.targetSlug));
}
