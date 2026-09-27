import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { grants } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { REDEEM_WINDOW_SECONDS } from "@/lib/rules";

export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";

  const [grant] = await db
    .select()
    .from(grants)
    .where(and(eq(grants.code, code), eq(grants.userId, user.id)))
    .limit(1);

  if (!grant) return NextResponse.json({ error: "That reward isn't yours." }, { status: 404 });
  // The whole point of gifting: once shared, it's no longer yours to use.
  if (grant.status === "gifted") {
    return NextResponse.json({ error: "You sent this to a friend — it's theirs now." }, { status: 409 });
  }
  if (grant.status === "redeemed") {
    return NextResponse.json({ error: "Already redeemed." }, { status: 409 });
  }
  if (grant.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "That reward has expired." }, { status: 409 });
  }

  // Two very different meanings depending on the reward.
  //
  // counter: burning it here, not when the timer runs out — the countdown
  //   exists to prove to the person behind the counter that this is being
  //   redeemed right now rather than being a screenshot, so it has to be
  //   spent the moment they're shown it. `redeemedAt` anchors the countdown,
  //   so a refresh mid-window resumes it instead of restarting it.
  //
  // online: we cannot see the moment a code is pasted into someone else's
  //   checkout, so this is the customer telling us they've used it. It's
  //   self-reported, and the brand's dashboard labels it as such rather than
  //   passing it off as a confirmed redemption.
  const redeemedAt = new Date();
  await db
    .update(grants)
    .set({ status: "redeemed", redeemedAt })
    .where(eq(grants.id, grant.id));

  return NextResponse.json({
    ok: true,
    code: grant.code,
    label: grant.label,
    brandName: grant.brandName,
    redemptionType: grant.redemptionType,
    couponCode: grant.couponCode,
    instructions: grant.instructions,
    redeemUrl: grant.redeemUrl,
    redeemedAt: redeemedAt.toISOString(),
    // Only a counter reward gets a live window; there's no one to show an
    // online code to.
    windowSeconds: grant.redemptionType === "counter" ? REDEEM_WINDOW_SECONDS : 0,
  });
}
