import { and, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { bids, brands } from "./db/schema";

export type ConfirmOutcome =
  | { ok: true; alreadyPaid: boolean; amountPaise: number }
  | { ok: false; reason: "no-db" | "unknown-order" | "amount-mismatch" };

/**
 * Mark a bid paid and list the brand on the board.
 *
 * There are two ways a payment reaches us — the browser coming back from
 * checkout, and Razorpay's `payment.captured` webhook — and they race: a
 * brand on a fast connection beats the webhook, a brand who closes the tab
 * is *only* reached by it, and sometimes both land at once. Both go through
 * here so there is exactly one piece of code that decides a bid is live.
 *
 * The transition is claimed with a conditional update rather than a
 * read-then-write. Whichever caller flips `created` to `paid` owns it and
 * lists the brand; the loser gets `alreadyPaid` and does nothing, so a
 * duplicate delivery (Razorpay retries until it sees a 2xx) can't double
 * anything.
 */
export async function confirmBid(opts: {
  orderId: string;
  paymentId: string;
  /** Captured amount in paise, when the caller knows it (the webhook does). */
  paidAmountPaise?: number;
}): Promise<ConfirmOutcome> {
  if (!db) return { ok: false, reason: "no-db" };
  const { orderId, paymentId, paidAmountPaise } = opts;

  const [bid] = await db.select().from(bids).where(eq(bids.razorpayOrderId, orderId)).limit(1);
  if (!bid) return { ok: false, reason: "unknown-order" };

  // A capture for some other amount is not this bid being paid for, whatever
  // the order id says. Refusing here keeps a mispriced or tampered capture
  // from buying a position it didn't pay for.
  if (paidAmountPaise !== undefined && paidAmountPaise !== bid.amountPaise) {
    return { ok: false, reason: "amount-mismatch" };
  }

  const now = new Date();
  const claimed = await db
    .update(bids)
    .set({ status: "paid", razorpayPaymentId: paymentId, paidAt: now })
    .where(and(eq(bids.id, bid.id), sql`${bids.status} <> 'paid'`))
    .returning();

  // Someone else got there first — the board is already correct.
  if (claimed.length === 0) return { ok: true, alreadyPaid: true, amountPaise: bid.amountPaise };

  // The amount is now always the flat listing fee, so there's no "raising a
  // bid" to race against — but the guard stays: it's what stops a bid row
  // that somehow got this far for an already-listed brand from touching
  // `bidAt` and quietly resetting their tie-break position.
  await db
    .update(brands)
    .set({ bidPaise: bid.amountPaise, bidAt: now })
    .where(and(eq(brands.id, bid.brandId), sql`${brands.bidPaise} < ${bid.amountPaise}`));

  return { ok: true, alreadyPaid: false, amountPaise: bid.amountPaise };
}
