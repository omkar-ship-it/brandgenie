import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { bids, brands } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/board";
import { verifySignature } from "@/lib/razorpay";

/**
 * The bid only goes live here, after Razorpay's signature checks out. The
 * board reads `brands.bidPaise`, which nothing else writes.
 */
export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const owned = await getBrandForUser(user.id);
  if (!owned) return NextResponse.json({ error: "Set up your brand first." }, { status: 400 });

  const body = await req.json().catch(() => null);
  const bidId = typeof body?.bidId === "string" ? body.bidId : "";
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const paymentId = typeof body?.paymentId === "string" ? body.paymentId : `mock_pay_${bidId}`;
  const signature = typeof body?.signature === "string" ? body.signature : "";

  const [bid] = await db
    .select()
    .from(bids)
    .where(and(eq(bids.id, bidId), eq(bids.brandId, owned.brand.id)))
    .limit(1);

  if (!bid) return NextResponse.json({ error: "That bid doesn't exist." }, { status: 404 });
  // The order has to match before anything else answers, including the
  // already-paid shortcut — a request carrying the wrong order id should
  // never come back as success, even when it would change nothing.
  if (bid.razorpayOrderId !== orderId) {
    return NextResponse.json({ error: "Payment doesn't match this bid." }, { status: 400 });
  }
  // A genuine retry of a bid that already landed: same order, nothing to do.
  if (bid.status === "paid") return NextResponse.json({ ok: true, alreadyPaid: true });
  if (!verifySignature(orderId, paymentId, signature)) {
    await db.update(bids).set({ status: "failed" }).where(eq(bids.id, bid.id));
    return NextResponse.json({ error: "We couldn't verify that payment." }, { status: 400 });
  }

  const now = new Date();
  await db
    .update(bids)
    .set({ status: "paid", razorpayPaymentId: paymentId, paidAt: now })
    .where(eq(bids.id, bid.id));

  await db
    .update(brands)
    .set({ bidPaise: bid.amountPaise, bidAt: now })
    .where(eq(brands.id, owned.brand.id));

  return NextResponse.json({ ok: true, amountPaise: bid.amountPaise });
}
