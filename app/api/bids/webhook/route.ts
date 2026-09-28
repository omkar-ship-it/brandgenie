import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { confirmBid } from "@/lib/bids";
import { verifyWebhookSignature, webhookConfigured } from "@/lib/razorpay";

/**
 * Razorpay tells us a payment was captured.
 *
 * Without this, a bid only goes live because the brand's browser came back
 * from checkout and told us so. A brand who pays and then closes the tab,
 * loses signal in a lift, or gets bounced by a bank redirect has been
 * charged for a position they never got — we took the money and the board
 * never moved. This is the path that doesn't depend on their device
 * surviving the round trip.
 *
 * Razorpay retries until it sees a 2xx, so the rules here are:
 *   - a bad signature is 401 and nothing else happens
 *   - anything we genuinely can't process yet is 5xx, so it comes back
 *   - everything else is 200, including events we don't care about, so it
 *     stops retrying something that will never succeed
 */
export const dynamic = "force-dynamic";

type PaymentEntity = {
  id?: unknown;
  order_id?: unknown;
  amount?: unknown;
  status?: unknown;
};

export async function POST(req: Request) {
  // The signed bytes, not a re-serialisation of them: parsing and
  // re-stringifying changes key order and whitespace, and the signature
  // stops matching a payload nobody touched.
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!webhookConfigured) {
    // Loud, because the failure mode is silent: payments keep working and
    // only the tab-closers quietly lose their bid.
    console.error("[razorpay] webhook received but RAZORPAY_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  if (!verifyWebhookSignature(raw, signature)) {
    console.warn("[razorpay] webhook signature rejected");
    return NextResponse.json({ error: "Bad signature." }, { status: 401 });
  }

  let body: { event?: unknown; payload?: { payment?: { entity?: PaymentEntity } } };
  try {
    body = JSON.parse(raw);
  } catch {
    // Signed by us but not JSON — retrying won't fix it.
    return NextResponse.json({ ok: true, ignored: "unparseable" });
  }

  const event = typeof body.event === "string" ? body.event : "";
  if (event !== "payment.captured") {
    // Razorpay delivers whatever the dashboard subscribes to; acknowledge
    // the rest rather than making it retry forever.
    return NextResponse.json({ ok: true, ignored: event || "unknown" });
  }

  const entity = body.payload?.payment?.entity ?? {};
  const orderId = typeof entity.order_id === "string" ? entity.order_id : "";
  const paymentId = typeof entity.id === "string" ? entity.id : "";
  const amount = typeof entity.amount === "number" ? entity.amount : undefined;

  if (!orderId || !paymentId) {
    return NextResponse.json({ ok: true, ignored: "no order on payment" });
  }

  if (!hasDb) {
    // Worth retrying — the payment is real and the bid still needs to land.
    return NextResponse.json({ error: "No database." }, { status: 503 });
  }

  const result = await confirmBid({ orderId, paymentId, paidAmountPaise: amount });

  if (!result.ok) {
    // An order we don't recognise is not our problem to retry — it may
    // belong to another environment sharing the account. An amount that
    // doesn't match the bid is a real discrepancy and wants a human, but
    // retrying it won't change the answer either.
    console.error(`[razorpay] webhook could not confirm ${orderId}: ${result.reason}`);
    return NextResponse.json({ ok: true, ignored: result.reason });
  }

  console.log(
    `[razorpay] webhook confirmed ${orderId} (${paymentId})` +
      `${result.alreadyPaid ? " — already live, no change" : ` — bid is live at ${result.amountPaise} paise`}`
  );
  return NextResponse.json({ ok: true, alreadyPaid: result.alreadyPaid });
}
