import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { bids } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/board";
import { confirmBid } from "@/lib/bids";
import { verifySignature } from "@/lib/razorpay";

/**
 * The brand's browser coming back from checkout — the fast path.
 *
 * It isn't the only path: `../webhook` hears the same payment from Razorpay
 * directly, which is what covers a brand who pays and closes the tab. The
 * two race and either may win, so neither writes the board itself — both
 * hand off to `confirmBid`, which owns that transition.
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
  // This also covers the webhook having got here first.
  if (bid.status === "paid") return NextResponse.json({ ok: true, alreadyPaid: true });
  if (!verifySignature(orderId, paymentId, signature)) {
    // Marked failed for the audit trail, not as a verdict on the payment:
    // if Razorpay really did capture it, the webhook will still confirm it,
    // and `confirmBid` moves the board whatever this row currently says.
    await db.update(bids).set({ status: "failed" }).where(eq(bids.id, bid.id));
    return NextResponse.json({ error: "We couldn't verify that payment." }, { status: 400 });
  }

  const result = await confirmBid({ orderId, paymentId });
  if (!result.ok) return NextResponse.json({ error: "We couldn't record that payment." }, { status: 500 });

  return NextResponse.json({ ok: true, alreadyPaid: result.alreadyPaid, amountPaise: result.amountPaise });
}
