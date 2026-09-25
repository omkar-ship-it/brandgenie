import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { bids } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/board";
import { createOrder, razorpayConfigured, razorpayKeyId } from "@/lib/razorpay";
import { BID_BASE_PAISE, BID_STEP_PAISE } from "@/lib/rules";

export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const owned = await getBrandForUser(user.id);
  if (!owned) return NextResponse.json({ error: "Set up your brand first." }, { status: 400 });
  if (!owned.reward) return NextResponse.json({ error: "Add a reward first." }, { status: 400 });

  const body = await req.json().catch(() => null);
  const amountPaise = Math.round(Number(body?.amountPaise));
  if (!Number.isFinite(amountPaise) || amountPaise < BID_BASE_PAISE || amountPaise % BID_STEP_PAISE !== 0) {
    return NextResponse.json({ error: "That bid amount isn't valid." }, { status: 400 });
  }
  if (amountPaise <= owned.brand.bidPaise) {
    return NextResponse.json({ error: "Your new bid has to beat your current one." }, { status: 400 });
  }

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
