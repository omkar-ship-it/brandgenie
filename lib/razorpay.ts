import { createHmac, timingSafeEqual } from "crypto";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

/** Live keys present? When they aren't, bidding runs in a labelled test mode. */
export const razorpayConfigured = Boolean(keyId && keySecret);
export const razorpayKeyId = keyId ?? null;

export type CreatedOrder = { orderId: string; amountPaise: number; mock: boolean };

export async function createOrder(amountPaise: number, receipt: string): Promise<CreatedOrder> {
  if (!razorpayConfigured) {
    return { orderId: `mock_order_${receipt}`, amountPaise, mock: true };
  }

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[razorpay] order create failed", res.status, body);
    throw new Error("Couldn't start the payment.");
  }

  const order = (await res.json()) as { id: string; amount: number };
  return { orderId: order.id, amountPaise: order.amount, mock: false };
}

/**
 * Razorpay signs `order_id|payment_id` with the key secret. Compared in
 * constant time; in test mode we accept the mock order we issued ourselves
 * and nothing else.
 */
export function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!razorpayConfigured) return orderId.startsWith("mock_order_");

  const expected = createHmac("sha256", keySecret!).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature ?? "", "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
