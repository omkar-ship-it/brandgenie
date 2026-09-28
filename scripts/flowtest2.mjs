/**
 * Focused suite for the flows that aren't covered by flowtest.mjs:
 *
 *   1. brand listing — sign up, list, add a reward, edit it
 *   2. payment      — order, signature check, tamper, replay, board effect
 *   3. overnight reset — a spent round frees up when the day key rolls
 *   4. claimed-out brands — the genie steps over an empty shelf
 *
 * Needs PGURL pointed at the LOCAL database — it writes rows and reads the
 * day key back out. Self-cleaning: everything it makes is torn down on exit.
 *
 *   PGURL=... BASE=http://localhost:3000 node scripts/flowtest2.mjs
 */
import { execSync } from "child_process";

const BASE = process.env.BASE ?? "http://localhost:3000";
const PGURL = process.env.PGURL;
if (!PGURL) {
  console.error("PGURL is required (local database).");
  process.exit(1);
}
if (!/localhost|127\.0\.0\.1/.test(PGURL)) {
  console.error("Refusing to run against a non-local database.");
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
  })
    .toString()
    .trim();

const jar = new Map();
async function call(path, { method = "GET", body, as } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(as ? { Cookie: `bg_session=${jar.get(as)}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data, text };
}

function signIn(label, email, role) {
  const sid = q(`with u as (
      insert into users (email, role) values ('${email}','${role}')
      on conflict (email) do update set role='${role}' returning id
    ) insert into sessions (user_id, expires_at)
      select id, now() + interval '2 hours' from u returning id;`).split("\n")[0];
  jar.set(label, sid);
  return sid;
}

// ------------------------------------------------------------ teardown
const madeEmails = [];
const restore = [];
process.on("exit", () => {
  for (const sql of restore) { try { q(sql); } catch {} }
  for (const e of madeEmails) {
    try { q(`delete from users where email = '${e}'`); } catch {}
  }
});

console.log(`\n=== LoyalGenie · listing, payment, reset, claimed-out — ${BASE}\n`);

const dayKey = q(`select to_char(now() at time zone 'utc' + interval '330 minutes', 'YYYY-MM-DD')`);
console.log(`(IST day key: ${dayKey})\n`);

// =========================================================== 1. LISTING
console.log("-- brand listing");
const bEmail = `t2-brand-${stamp}@brandgenie.test`;
madeEmails.push(bEmail);
signIn("brand", bEmail, "merchant");

let r = await call("/api/brand", {
  method: "POST",
  as: "brand",
  body: { name: "", category: "Shopping", rewardLabel: "Ten percent off" },
});
ok("listing: a nameless brand is refused", r.status === 400, r.data.error);

r = await call("/api/brand", {
  method: "POST",
  as: "brand",
  body: { name: `Testwallah ${stamp}`, category: "Not A Category", rewardLabel: "Ten percent off" },
});
ok("listing: an invented category is refused", r.status === 400, r.data.error);

r = await call("/api/brand", {
  method: "POST",
  as: "brand",
  body: { name: `Testwallah ${stamp}`, category: "Shopping", rewardLabel: "x" },
});
ok("listing: a listing with no real reward is refused", r.status === 400, r.data.error);

r = await call("/api/brand", {
  method: "POST",
  as: "brand",
  body: {
    name: `Testwallah ${stamp}`,
    category: "Shopping",
    tagline: "Things, tested",
    area: "Nationwide",
    website: "https://testwallah.example",
    instagram: "https://instagram.com/testwallah",
    rewardLabel: "₹200 off your first order",
    rewardIcon: "🛍️",
    redemptionType: "counter",
    instructions: "Show this screen at the counter.",
    totalStock: 25,
    validDays: 14,
  },
});
ok("listing: a complete listing is accepted", r.status === 200, `status=${r.status}`);

let row = q(`select b.id, b.bid_paise, r.total_stock, r.remaining, r.redemption_type
             from brands b join rewards r on r.brand_id = b.id
             where b.name = 'Testwallah ${stamp}'`).split("|");
const brandId = row[0];
ok("listing: the brand exists with its reward", Boolean(brandId), `stock=${row[2]} remaining=${row[3]}`);
ok("listing: stock is what the brand typed", row[2] === "25" && row[3] === "25", `${row[3]}/${row[2]}`);
ok("listing: an unpaid listing is not on the board yet", row[1] === "0", `bid_paise=${row[1]}`);

const boardBefore = await call("/");
ok("listing: and does not appear on the board page", !boardBefore.text.includes(`Testwallah ${stamp}`));

// Raising total stock tops up rather than resetting — the guard that stops an
// edit wiping out rewards already promised.
q(`update rewards set remaining = 10 where brand_id = '${brandId}'`);
await call("/api/brand", {
  method: "POST",
  as: "brand",
  body: {
    name: `Testwallah ${stamp}`, category: "Shopping", rewardLabel: "₹200 off your first order",
    redemptionType: "counter", totalStock: 40, validDays: 14,
  },
});
row = q(`select total_stock, remaining from rewards where brand_id = '${brandId}'`).split("|");
ok("listing: raising stock tops up what's left, not resets it", row[0] === "40" && row[1] === "25", `${row[1]}/${row[0]}`);

// =========================================================== 2. PAYMENT
console.log("\n-- bidding and payment");

r = await call("/api/bids/create-order", { method: "POST", as: "brand", body: { amountPaise: 20000 } });
ok("payment: a bid under the ₹500 floor is refused", r.status === 400, r.data.error);

r = await call("/api/bids/create-order", { method: "POST", as: "brand", body: { amountPaise: 50500 } });
ok("payment: a bid off the ₹100 step is refused", r.status === 400, r.data.error);

r = await call("/api/bids/create-order", { method: "POST", as: "brand", body: { amountPaise: 120000 } });
const order = r.data;
ok("payment: a valid bid opens an order", r.status === 200 && Boolean(order.orderId), `order=${order.orderId}`);
ok("payment: local runs in labelled test mode, no live key", order.mock === true && order.keyId === null);

let pending = q(`select status, amount_paise from bids where id = '${order.bidId}'`).split("|");
ok("payment: the bid is unpaid until money lands", pending[0] === "created", pending[0]);
ok("payment: the board still doesn't show it", q(`select bid_paise from brands where id = '${brandId}'`) === "0");

// Wrong order id must fail before anything else answers.
r = await call("/api/bids/verify", {
  method: "POST", as: "brand",
  body: { bidId: order.bidId, orderId: "mock_order_somebody_else", signature: "x" },
});
ok("payment: a mismatched order is rejected", r.status === 400, r.data.error);

// A forged order id that isn't one we issued.
r = await call("/api/bids/verify", {
  method: "POST", as: "brand",
  body: { bidId: order.bidId, orderId: "forged_order_1", signature: "x" },
});
ok("payment: a forged order id is rejected", r.status === 400, r.data.error);

ok("payment: a rejected attempt still leaves the bid unpaid",
  q(`select status from bids where id = '${order.bidId}'`) !== "paid");

// The real thing.
r = await call("/api/bids/verify", {
  method: "POST", as: "brand",
  body: { bidId: order.bidId, orderId: order.orderId, paymentId: "test_pay_1", signature: "sig" },
});
ok("payment: a verified payment is accepted", r.status === 200 && r.data.ok === true, `status=${r.status}`);

pending = q(`select status, razorpay_payment_id from bids where id = '${order.bidId}'`).split("|");
ok("payment: the bid is marked paid with its payment id", pending[0] === "paid" && pending[1] === "test_pay_1");
ok("payment: and only now does the board carry the bid",
  q(`select bid_paise from brands where id = '${brandId}'`) === "120000");

const boardAfter = await call("/");
ok("payment: the brand is on the board page", boardAfter.text.includes(`Testwallah ${stamp}`));

// Replay of the same confirmation.
r = await call("/api/bids/verify", {
  method: "POST", as: "brand",
  body: { bidId: order.bidId, orderId: order.orderId, paymentId: "test_pay_1", signature: "sig" },
});
ok("payment: replaying the same confirmation is a no-op, not a second charge",
  r.status === 200 && r.data.alreadyPaid === true);
ok("payment: the bid amount did not move on replay",
  q(`select bid_paise from brands where id = '${brandId}'`) === "120000");

// Someone else's bid.
const oEmail = `t2-other-${stamp}@brandgenie.test`;
madeEmails.push(oEmail);
signIn("other", oEmail, "merchant");
r = await call("/api/bids/verify", {
  method: "POST", as: "other",
  body: { bidId: order.bidId, orderId: order.orderId, signature: "sig" },
});
ok("payment: another merchant can't confirm this bid", r.status !== 200, `status=${r.status}`);

// A lower re-bid can't be used to move down.
r = await call("/api/bids/create-order", { method: "POST", as: "brand", body: { amountPaise: 100000 } });
ok("payment: a re-bid below the current one is refused", r.status === 400, r.data.error);

// Signed out.
r = await call("/api/bids/create-order", { method: "POST", body: { amountPaise: 120000 } });
ok("payment: a signed-out visitor can't open an order", r.status === 401);

// ====================================================== 3. OVERNIGHT RESET
console.log("\n-- overnight reset");

const pEmail = `t2-play-${stamp}@brandgenie.test`;
madeEmails.push(pEmail);
signIn("player", pEmail, "customer");
const playerId = q(`select id from users where email = '${pEmail}'`);

r = await call("/api/play/walk", { as: "player" });
ok("reset: a fresh player can start a round", r.status === 200, `status=${r.status}`);

// Record today's round the way a real stop would.
q(`insert into plays (user_id, day_key, mode, landed_position, steps)
   values ('${playerId}', '${dayKey}', 'stop', 1, 3)`);

r = await call("/api/play/walk", { as: "player" });
ok("reset: a second round the same day is blocked", r.status === 409, r.data.error);

// Roll that round back to yesterday — exactly what midnight IST does to it.
q(`update plays set day_key = to_char(date '${dayKey}' - 1, 'YYYY-MM-DD')
   where user_id = '${playerId}'`);

r = await call("/api/play/walk", { as: "player" });
ok("reset: once the day key rolls, the round is available again", r.status === 200, `status=${r.status}`);

ok("reset: yesterday's play is kept, not deleted",
  q(`select count(*) from plays where user_id = '${playerId}'`) === "1");

// The day key has to roll at midnight IST, not midnight UTC — otherwise the
// reset lands at 5.30am for everyone the product is built for. Comparing
// today's UTC and IST dates proves nothing for most of the day, so the
// boundary itself is what gets tested.
const { dayKey: keyAt } = await import("../lib/rules.ts");
const at = (iso) => keyAt(new Date(iso));
ok("reset: 23:59:59 IST is still the old day",
  at("2026-09-27T18:29:59Z") === "2026-09-27", at("2026-09-27T18:29:59Z"));
ok("reset: 00:00:00 IST rolls to the new day",
  at("2026-09-27T18:30:00Z") === "2026-09-28", at("2026-09-27T18:30:00Z"));
ok("reset: the roll is IST midnight, not UTC midnight",
  at("2026-09-27T23:00:00Z") === "2026-09-28" && at("2026-09-27T18:00:00Z") === "2026-09-27",
  "23:00Z -> 28th (IST 04:30), 18:00Z -> 27th (IST 23:30)");

// A round is per-mode, so the try board can't burn the real one.
r = await call("/api/play/walk?demo=1", { as: "player" });
ok("reset: the showcase round is a preview whatever the real round's state",
  r.status === 200 && r.data.preview === true);

// ==================================================== 4. CLAIMED-OUT BRANDS
console.log("\n-- brands whose rewards are all claimed");

const demo = q(`select b.name, b.id, r.id, r.remaining
                from brands b join rewards r on r.brand_id = b.id
                where b.is_demo = true and r.remaining = 0`);
ok("claimed-out: the showcase board has some brands that ran out", demo.length > 0,
  demo.split("\n").map((l) => l.split("|")[0]).join(", "));

// Which positions are they? Board order is bid desc, bid_at asc.
const positions = q(`select row_number() over (order by b.bid_paise desc, b.bid_at asc) as pos, r.remaining
                     from brands b left join rewards r on r.brand_id = b.id
                     where b.is_demo = true and b.bid_paise > 0`)
  .split("\n")
  .map((l) => l.split("|"))
  .filter(([, rem]) => rem === "0")
  .map(([pos]) => Number(pos));
ok("claimed-out: their board positions are known", positions.length > 0, `#${positions.join(", #")}`);

r = await call("/api/play/walk?demo=1");
const walkOrder = r.data.order ?? [];
ok("claimed-out: the walk still has plenty to land on", walkOrder.length > 0, `${walkOrder.length} stops`);
ok("claimed-out: the genie's walk order skips every one of them",
  positions.every((p) => !walkOrder.includes(p)),
  `skipped #${positions.join(", #")}`);
ok("claimed-out: nothing else was dropped from the walk",
  walkOrder.length === Number(q(`select count(*) from brands b join rewards r on r.brand_id = b.id
                             where b.is_demo = true and b.bid_paise > 0 and r.remaining > 0`)));

// However long you let him walk, he can never resolve onto one.
const landings = new Set();
for (let i = 0; i < walkOrder.length * 3; i++) landings.add(walkOrder[i % walkOrder.length]);
ok("claimed-out: no reachable landing is a claimed-out brand",
  [...landings].every((p) => !positions.includes(p)));

// The tile is still shown, and marked.
const tryPage = await call("/try");
const outName = demo.split("\n")[0].split("|")[0];
ok("claimed-out: the brand is still on the board", tryPage.text.includes(outName), outName);
ok("claimed-out: and the tile is marked", tryPage.text.includes("ALL CLAIMED"));
ok("claimed-out: the board says he'll walk past them",
  /walks\s+straight\s+past/.test(tryPage.text.replace(/<[^>]+>/g, " ")));

// A board with nothing left at all refuses the round rather than
// silently handing over an empty walk.
const liveIds = q(`select r.id from brands b join rewards r on r.brand_id = b.id
                   where b.is_demo = true and r.remaining > 0`).split("\n").filter(Boolean);
restore.push(`update rewards set remaining = 14 where id in ('${liveIds.join("','")}') and remaining = 0`);
q(`update rewards set remaining = 0 where id in ('${liveIds.join("','")}')`);
r = await call("/api/play/walk?demo=1");
ok("claimed-out: a board with nothing left refuses the round", r.status === 409, r.data.error);
q(`update rewards set remaining = 14 where id in ('${liveIds.join("','")}')`);
r = await call("/api/play/walk?demo=1");
ok("claimed-out: and works again once stock is back", r.status === 200, `status=${r.status}`);
// Put the two simulated ones back out.
q(`update rewards set remaining = 0 from brands b
   where rewards.brand_id = b.id and b.is_demo = true and b.name in ('Kaapi Kettle','Sur Stream')`);

console.log(`\n=== ${pass} passed, ${fail} failed\n`);
process.exitCode = fail ? 1 : 0;
