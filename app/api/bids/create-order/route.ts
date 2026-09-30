import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { bids } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/board";
import { createOrder, razorpayConfigured, razorpayKeyId } from "@/lib/razorpay";
import { LISTING_FEE_PAISE } from "@/lib/rules";

/**
 * Open an order for the listing fee.
 *
 * There's nothing to negotiate any more: the fee is flat and the same for
 * every brand, so unlike the old bidding flow this reads no amount from the
 * client at all — there's no number left for a tampered request to lie
 * about. The only thing this route decides is whether the brand is allowed
 * to pay right now.
 *
 * A brand pays exactly once. Position afterwards is earned in customer
 * votes, not bought again, so an already-listed brand has nothing to order.
 */
export async function POST() {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const owned = await getBrandForUser(user.id);
  if (!owned) return NextResponse.json({ error: "Set up your brand first." }, { status: 400 });
  if (!owned.reward) return NextResponse.json({ error: "Add a reward first." }, { status: 400 });
  if (owned.brand.bidPaise > 0) {
    return NextResponse.json({ error: "You're already listed on the Board." }, { status: 400 });
  }

  const amountPaise = LISTING_FEE_PAISE;

  const [bid] = await db
    .insert(bids)
    .values({ brandId: owned.brand.id, amountPaise })
    .returning();

  const order = await createOrder(amountPaise, bid.id);
  await db.update(bids).set({ razorpayOrderId: order.orderId }).where(eq(bids.id, bid.id));

  return NextResponse.json({
    ok: true,
    bidId: bid.id,
    orderId: order.orderId,
    amountPaise: order.amountPaise,
    mock: order.mock,
    keyId: razorpayConfigured ? razorpayKeyId : null,
    brandName: owned.brand.name,
    email: user.email,
  });
}
