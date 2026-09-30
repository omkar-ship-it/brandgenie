import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { isValidEmail } from "@/lib/newsletter";

/**
 * Subscribe an address to the newsletter — curated deals from the brands
 * on the board. Works signed out (just an email, no account needed) and
 * signed in (the account is attached for record-keeping, but the email is
 * still what makes a subscriber a subscriber).
 *
 * Upserts rather than rejecting a repeat: a second submission with the same
 * address is what re-subscribing looks like once an unsubscribe link
 * exists, so this clears `unsubscribedAt` on conflict instead of erroring —
 * harmless today, since nothing sets that column yet, but it means turning
 * on an unsubscribe link later doesn't also require rewriting this route.
 */
export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a real email address." }, { status: 400 });
  }

  const user = await getSessionUser();

  await db
    .insert(newsletterSubscribers)
    .values({ email, userId: user?.id })
    .onConflictDoUpdate({
      target: newsletterSubscribers.email,
      // Only overwrite the account link if this submission actually has
      // one — a later signed-out resubscribe from the same address must
      // not erase an account link an earlier signed-in submission set.
      set: user?.id ? { unsubscribedAt: null, userId: user.id } : { unsubscribedAt: null },
    });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(newsletterSubscribers)
    .where(sql`${newsletterSubscribers.unsubscribedAt} is null`);

  return NextResponse.json({ ok: true, count });
}
