import { sql } from "drizzle-orm";
import { db, hasDb } from "./db";
import { newsletterSubscribers } from "./db/schema";

/** Active subscriber count, shown as honest social proof next to the form. */
export async function getNewsletterCount(): Promise<number> {
  if (!hasDb || !db) return 0;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(newsletterSubscribers)
    .where(sql`${newsletterSubscribers.unsubscribedAt} is null`);
  return row?.count ?? 0;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (email: string) => EMAIL_RE.test(email);
