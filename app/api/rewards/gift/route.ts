import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { grants } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { sendGiftEmail } from "@/lib/email";

/**
 * Sending a reward to a friend gives it away for good: the grant flips to
 * "gifted", which is what stops the sender redeeming it. Only the friend who
 * claims it can use it after this.
 */
export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const toEmail = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return NextResponse.json({ error: "Enter your friend's email." }, { status: 400 });
  }
  if (toEmail === user.email) {
    return NextResponse.json({ error: "That's your own address." }, { status: 400 });
  }

  const [grant] = await db
    .select()
    .from(grants)
    .where(and(eq(grants.code, code), eq(grants.userId, user.id)))
    .limit(1);

  if (!grant) return NextResponse.json({ error: "That reward isn't yours." }, { status: 404 });
  if (grant.status === "redeemed") {
    return NextResponse.json({ error: "You've already redeemed that one." }, { status: 409 });
  }
  if (grant.status === "gifted") {
    return NextResponse.json({ error: "That one's already on its way to someone." }, { status: 409 });
  }
  if (grant.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "That reward has expired." }, { status: 409 });
  }

  await db
    .update(grants)
    .set({ status: "gifted", giftedToEmail: toEmail, giftedAt: new Date(), giftedByUserId: user.id })
    .where(eq(grants.id, grant.id));

  const url = `${new URL(req.url).origin}/r/${grant.code}`;
  await sendGiftEmail(toEmail, { from: user.email, label: grant.label, url });

  return NextResponse.json({ ok: true, url });
}
