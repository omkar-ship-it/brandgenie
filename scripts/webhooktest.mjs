/**
 * The Razorpay `payment.captured` webhook.
 *
 * This is the path that catches a brand who pays and closes the tab, so the
 * cases that matter are the unhappy ones: a forged delivery, a replay, and a
 * capture that arrives while the browser is confirming the same payment.
 *
 * The listing fee is flat and paid once, so unlike the old bidding model
 * there's no "raise your bid" to race against — a brand only ever has one
 * order in its lifetime, which is why the race scenario below uses a fresh
 * brand of its own rather than a second order on the setup brand.
 *
 * Local only. Signs with RAZORPAY_WEBHOOK_SECRET from .env.local, which is a
 * throwaway — the real secret lives on production.
 *
 *   PGURL=... node --env-file=.env.local scripts/webhooktest.mjs
 */
import { createHmac } from "crypto";
import { execSync } from "child_process";
import { LISTING_FEE_PAISE } from "../lib/rules.ts";

const BASE = process.env.BASE ?? "http://localhost:3000";
const PGURL = process.env.PGURL;
const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

if (!PGURL || !/localhost|127\.0\.0\.1/.test(PGURL)) {
  console.error("PGURL must be set and point at the local database.");
  process.exit(1);
}
if (!SECRET) {
  console.error("RAZORPAY_WEBHOOK_SECRET is not set — run with --env-file=.env.local");
  process.exit(1);
}

const stamp = Date.now().toString(36);
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? "  ok  " : "FAIL  "}${name}${extra ? "  — " + extra : ""}`);
};

const q = (sql) =>
  execSync(`psql "$PGURL" -t -A -F'|' -c ${JSON.stringify(sql.replace(/\s+/g, " ").trim())}`, {
    env: { ...process.env, PGURL },
    stdio: ["ignore", "pipe", "pipe"],
  }).toString().trim();

const emails = [];
process.on("exit", () => {
  for (const e of emails) { try { q(`delete from users where email = '${e}'`); } catch {} }
});

/** A delivery shaped the way Razorpay shapes one. */
const capturedEvent = (orderId, paymentId, amount) => ({
  entity: "event",
  account_id: "acc_test",
  event: "payment.captured",
  contains: ["payment"],
  payload: { payment: { entity: { id: paymentId, entity: "payment", amount, currency: "INR", status: "captured", order_id: orderId } } },
  created_at: Math.floor(Date.now() / 1000),
});

async function deliver(payload, { secret = SECRET, tamper = false } = {}) {
  const raw = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(raw).digest("hex");
  const res = await fetch(`${BASE}/api/bids/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Razorpay-Signature": signature },
    // Signed one body, sent another — what a man-in-the-middle edit looks like.
    body: tamper ? raw.replace(/"amount":\d+/, '"amount":100') : raw,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

const jar = new Map();
function signIn(label, email, role) {
  jar.set(label, q(`with u as (insert into users (email, role) values ('${email}','${role}')
    on conflict (email) do update set role='${role}' returning id)
    insert into sessions (user_id, expires_at) select id, now() + interval '2 hours' from u returning id;`).split("\n")[0]);
}
const call = async (path, { method = "GET", body, as } = {}) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(as ? { Cookie: `bg_session=${jar.get(as)}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};

console.log(`\n=== payment.captured webhook — ${BASE}\n`);

const FEE = LISTING_FEE_PAISE;

// A merchant with a listing, ready to pay.
const email = `t3-brand-${stamp}@brandgenie.test`;
emails.push(email);
signIn("brand", email, "merchant");
await call("/api/brand", {
  method: "POST", as: "brand",
  body: {
    name: `Webhookwallah ${stamp}`, category: "E-Commerce", tagline: "Pays and closes the tab",
    rewardLabel: "₹100 off", redemptionType: "counter", totalStock: 10, validDays: 14,
  },
});
const brandId = q(`select id from brands where name = 'Webhookwallah ${stamp}'`);
ok("setup: the brand is listed and off the board", q(`select bid_paise from brands where id = '${brandId}'`) === "0");

// ------------------------------------------------------- rejected deliveries
console.log("-- deliveries we must not act on");

const order = (await call("/api/bids/create-order", { method: "POST", as: "brand" })).data;
const ev = capturedEvent(order.orderId, "pay_test_1", FEE);

let res = await fetch(`${BASE}/api/bids/webhook`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ev),
});
ok("webhook: an unsigned delivery is refused", res.status === 401, `status=${res.status}`);

res = await deliver(ev, { secret: "not-the-secret" });
ok("webhook: a delivery signed with the wrong secret is refused", res.status === 401, `status=${res.status}`);

res = await deliver(ev, { tamper: true });
ok("webhook: a body edited after signing is refused", res.status === 401, `status=${res.status}`);

ok("webhook: none of those moved the board",
  q(`select bid_paise from brands where id = '${brandId}'`) === "0");
ok("webhook: and the payment is still unconfirmed",
  q(`select status from bids where razorpay_order_id = '${order.orderId}'`) === "created");

// A correctly signed capture for the wrong amount.
res = await deliver(capturedEvent(order.orderId, "pay_test_wrong", 100));
ok("webhook: a capture for the wrong amount is not confirmed", res.data.ignored === "amount-mismatch", JSON.stringify(res.data));
ok("webhook: which left the payment unconfirmed",
  q(`select status from bids where razorpay_order_id = '${order.orderId}'`) === "created");

// Events we don't subscribe to, and orders that aren't ours.
res = await deliver({ ...ev, event: "payment.failed" });
ok("webhook: an event we don't handle is acknowledged, not retried",
  res.status === 200 && res.data.ignored === "payment.failed");
res = await deliver(capturedEvent("order_from_another_account", "pay_x", FEE));
ok("webhook: an unknown order is acknowledged, not retried",
  res.status === 200 && res.data.ignored === "unknown-order");

// ------------------------------------------------------- the real thing
console.log("\n-- a brand who paid and closed the tab");

res = await deliver(ev);
ok("webhook: a genuine capture is accepted", res.status === 200 && res.data.ok === true, JSON.stringify(res.data));
ok("webhook: the payment is marked paid with its payment id",
  q(`select status || '/' || razorpay_payment_id from bids where razorpay_order_id = '${order.orderId}'`) === "paid/pay_test_1");
ok("webhook: and the brand went live without the browser ever coming back",
  q(`select bid_paise from brands where id = '${brandId}'`) === String(FEE));

const board = await fetch(`${BASE}/`).then((r) => r.text());
ok("webhook: the brand is on the board page", board.includes(`Webhookwallah ${stamp}`));

// Razorpay retries until it sees a 2xx.
res = await deliver(ev);
ok("webhook: a repeat delivery is a no-op", res.status === 200 && res.data.alreadyPaid === true);
ok("webhook: the repeat changed nothing",
  q(`select bid_paise from brands where id = '${brandId}'`) === String(FEE) &&
  q(`select count(*) from bids where razorpay_order_id = '${order.orderId}' and status = 'paid'`) === "1");

// A brand pays exactly once — create-order refuses a second order once listed.
const secondOrder = await call("/api/bids/create-order", { method: "POST", as: "brand" });
ok("webhook: an already-listed brand can't open a second order",
  secondOrder.status === 400, secondOrder.data.error);

// ------------------------------------------------------- the race
// Needs a brand of its own: the flat fee is paid once, so there's no such
// thing as a second order on an already-listed brand to race against.
console.log("\n-- webhook and browser arriving together, on a fresh brand");

const raceEmail = `t3-race-${stamp}@brandgenie.test`;
emails.push(raceEmail);
signIn("racer", raceEmail, "merchant");
await call("/api/brand", {
  method: "POST", as: "racer",
  body: {
    name: `Racewallah ${stamp}`, category: "E-Commerce", tagline: "Two confirmations, one payment",
    rewardLabel: "₹50 off", redemptionType: "counter", totalStock: 10, validDays: 14,
  },
});
const raceBrandId = q(`select id from brands where name = 'Racewallah ${stamp}'`);
const raceOrder = (await call("/api/bids/create-order", { method: "POST", as: "racer" })).data;

const [w, v] = await Promise.all([
  deliver(capturedEvent(raceOrder.orderId, "pay_test_race", FEE)),
  call("/api/bids/verify", { method: "POST", as: "racer", body: { bidId: raceOrder.bidId, orderId: raceOrder.orderId, paymentId: "pay_test_race", signature: "sig" } }),
]);
ok("race: both callers succeed", w.status === 200 && v.status === 200, `webhook=${w.status} browser=${v.status}`);
ok("race: exactly one of them claimed the transition",
  [w.data.alreadyPaid, v.data.alreadyPaid].filter(Boolean).length === 1,
  `webhook alreadyPaid=${w.data.alreadyPaid} browser alreadyPaid=${v.data.alreadyPaid}`);
ok("race: the payment is marked paid exactly once",
  q(`select count(*) from bids where razorpay_order_id = '${raceOrder.orderId}' and status = 'paid'`) === "1");
ok("race: the brand is listed at the flat fee",
  q(`select bid_paise from brands where id = '${raceBrandId}'`) === String(FEE));

console.log(`\n=== ${pass} passed, ${fail} failed\n`);
process.exitCode = fail ? 1 : 0;
