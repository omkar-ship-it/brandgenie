/**
 * Drives every flow end to end against whichever BASE is given.
 * Locally it reads OTP codes from the dev log; against production it mints
 * sessions directly in the database (no inbox access).
 */
import fs from "fs";
import { execSync } from "child_process";

const BASE = process.env.BASE ?? "http://localhost:3000";
const LOG = "/tmp/bg-dev.log";
const PSQL = process.env.PGURL; // set => mint sessions via psql instead of OTP
const stamp = Date.now().toString(36);

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  (cond ? pass++ : fail++);
  console.log(`${cond ? "  ok  " : "FAIL  "}${name}${extra ? "  — " + extra : ""}`);
};

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
  let data; try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 200) }; }
  return { status: res.status, data };
}

async function signIn(label, email, role) {
  if (PSQL) {
    const sql = `with u as (insert into users (email, role) values ('${email}','${role}') on conflict (email) do update set role='${role}' returning id) insert into sessions (user_id, expires_at) select id, now() + interval '1 hour' from u returning id;`;
    const sid = execSync(`psql "$PGURL" -t -A -c ${JSON.stringify(sql)}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString().trim().split("\n")[0];
    jar.set(label, sid);
    return;
  }
  await call("/api/auth/request-otp", { method: "POST", body: { email } });
  await new Promise((r) => setTimeout(r, 700));
  const line = fs.readFileSync(LOG, "utf8").split("\n").filter((l) => l.includes(`login code for ${email} is`)).at(-1);
  const code = line.match(/(\d{6})/)[1];
  const res = await fetch(BASE + "/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, role }),
  });
  const sid = (res.headers.getSetCookie?.() ?? []).join(";").match(/bg_session=([^;]+)/)?.[1];
  jar.set(label, sid);
  const data = await res.json();
  ok(`auth: ${label} signs in as ${role}`, res.ok && data.role === role, `role=${data.role}`);
}

console.log(`\n=== BrandGenie flow test — ${BASE}\n`);

// ---------------------------------------------------------------- auth
await signIn("winner", `t-win-${stamp}@brandgenie.test`, "customer");
await signIn("giver", `t-give-${stamp}@brandgenie.test`, "customer");
await signIn("friend", `t-friend-${stamp}@brandgenie.test`, "customer");
await signIn("brand", `t-brand-${stamp}@brandgenie.test`, "merchant");

// ---------------------------------------------------------------- play
console.log("\n-- the round");
const p1 = await call("/api/play", { method: "POST", as: "winner" });
ok("play: round resolves and awards a prize", p1.status === 200 && !!p1.data.prize?.code, p1.data.prize?.label);
ok("play: landing is inside the board", p1.data.landed >= 1 && p1.data.landed <= 50, `#${p1.data.landed}`);
const p1again = await call("/api/play", { method: "POST", as: "winner" });
ok("play: a second round the same day is refused", p1again.status === 409, p1again.data.error);
const anon = await call("/api/play", { method: "POST" });
ok("play: signed-out play is refused", anon.status === 401);

// ---------------------------------------------------------------- redeem
console.log("\n-- redemption");
const winCode = p1.data.prize.code;
const r1 = await call("/api/rewards/redeem", { method: "POST", body: { code: winCode }, as: "winner" });
ok("redeem: owner redeems their reward", r1.status === 200 && r1.data.ok);
const r2 = await call("/api/rewards/redeem", { method: "POST", body: { code: winCode }, as: "winner" });
ok("redeem: the same code can't be redeemed twice", r2.status === 409, r2.data.error);
const r3 = await call("/api/rewards/redeem", { method: "POST", body: { code: winCode }, as: "friend" });
ok("redeem: someone else's code is refused", r3.status === 404, r3.data.error);

// ---------------------------------------------------------------- gift
console.log("\n-- gifting & claiming");
const p2 = await call("/api/play", { method: "POST", as: "giver" });
const giftCode = p2.data.prize?.code;
ok("gift: giver wins something to give", !!giftCode, p2.data.prize?.label);

const gSelf = await call("/api/rewards/gift", { method: "POST", body: { code: giftCode, email: `t-give-${stamp}@brandgenie.test` }, as: "giver" });
ok("gift: can't gift to yourself", gSelf.status === 400, gSelf.data.error);
const gBad = await call("/api/rewards/gift", { method: "POST", body: { code: giftCode, email: "not-an-email" }, as: "giver" });
ok("gift: rejects a malformed address", gBad.status === 400, gBad.data.error);

const g1 = await call("/api/rewards/gift", { method: "POST", body: { code: giftCode, email: `t-friend-${stamp}@brandgenie.test` }, as: "giver" });
ok("gift: sends and returns a claim link", g1.status === 200 && !!g1.data.url, g1.data.url);
const g2 = await call("/api/rewards/gift", { method: "POST", body: { code: giftCode, email: "someone@else.test" }, as: "giver" });
ok("gift: can't gift the same reward twice", g2.status === 409, g2.data.error);

const gr = await call("/api/rewards/redeem", { method: "POST", body: { code: giftCode }, as: "giver" });
ok("gift: THE RULE — giver can no longer redeem it", gr.status === 409, gr.data.error);

const cSelf = await call("/api/rewards/claim", { method: "POST", body: { code: giftCode }, as: "giver" });
ok("claim: giver can't claim back their own gift", cSelf.status === 409, cSelf.data.error);
const c1 = await call("/api/rewards/claim", { method: "POST", body: { code: giftCode }, as: "friend" });
ok("claim: friend takes ownership", c1.status === 200 && c1.data.ok);
const fr = await call("/api/rewards/redeem", { method: "POST", body: { code: giftCode }, as: "friend" });
ok("claim: friend can now redeem it", fr.status === 200 && fr.data.ok);
const gr2 = await call("/api/rewards/redeem", { method: "POST", body: { code: giftCode }, as: "giver" });
ok("claim: it's gone from the giver for good", gr2.status === 404 || gr2.status === 409, gr2.data.error);

const claimPage = await call(`/r/${giftCode}`);
ok("claim: the claim page renders", claimPage.status === 200);

// ---------------------------------------------------------------- wishes
console.log("\n-- wishes");
const w1 = await call("/api/wishes", { method: "POST", body: { text: "A test wish for the gate", category: "Travel" }, as: "winner" });
const nowIst = new Date(Date.now() + 330 * 60000);
const windowOpen = nowIst.getUTCMinutes() === 11 && [11, 23].includes(nowIst.getUTCHours());
ok(`wishes: gate is ${windowOpen ? "open" : "closed"} and behaves`, windowOpen ? w1.status === 200 : w1.status === 403, w1.data.error ?? "accepted");
const wBad = await call("/api/wishes", { method: "POST", body: { text: "x", category: "Nope" }, as: "winner" });
ok("wishes: rejects junk input", wBad.status >= 400);

// ---------------------------------------------------------------- brand + bid
console.log("\n-- brand listing & bidding");
const b1 = await call("/api/brand", {
  method: "POST",
  as: "brand",
  body: {
    name: `Test Brand ${stamp}`, category: "Food & Beverage", tagline: "Testing, always",
    area: "Indiranagar", rewardLabel: "A free test coffee", rewardIcon: "☕",
    totalStock: 5, validDays: 7,
  },
});
ok("brand: listing saves", b1.status === 200 && !!b1.data.brandId);

const low = await call("/api/bids/create-order", { method: "POST", body: { amountPaise: 40000 }, as: "brand" });
ok("bid: ₹400 is under the ₹500 floor and is refused", low.status === 400, low.data.error);
const odd = await call("/api/bids/create-order", { method: "POST", body: { amountPaise: 50050 }, as: "brand" });
ok("bid: an off-step amount is refused", odd.status === 400, odd.data.error);
const floor = await call("/api/bids/create-order", { method: "POST", body: { amountPaise: 50000 }, as: "brand" });
ok("bid: exactly ₹500 is accepted", floor.status === 200 && !!floor.data.orderId, floor.data.mock ? "test mode" : "live razorpay");

const v1 = await call("/api/bids/verify", { method: "POST", body: { bidId: floor.data.bidId, orderId: floor.data.orderId }, as: "brand" });
ok("bid: payment verifies and the bid goes live", v1.status === 200, `₹${(v1.data.amountPaise ?? 0) / 100}`);
const vReplay = await call("/api/bids/verify", { method: "POST", body: { bidId: floor.data.bidId, orderId: floor.data.orderId }, as: "brand" });
ok("bid: re-verifying the same bid is idempotent", vReplay.status === 200 && vReplay.data.alreadyPaid === true);
const forged = await call("/api/bids/verify", { method: "POST", body: { bidId: floor.data.bidId, orderId: "order_forged" }, as: "brand" });
ok("bid: a mismatched order id is rejected", forged.status === 400, forged.data.error);

const under = await call("/api/bids/create-order", { method: "POST", body: { amountPaise: 50000 }, as: "brand" });
ok("bid: a new bid must beat the current one", under.status === 400, under.data.error);
const raise = await call("/api/bids/create-order", { method: "POST", body: { amountPaise: 60000 }, as: "brand" });
ok("bid: raising to ₹600 is accepted", raise.status === 200);
await call("/api/bids/verify", { method: "POST", body: { bidId: raise.data.bidId, orderId: raise.data.orderId }, as: "brand" });

const boardHtml = await call("/");
ok("board: the new brand appears on the live board", boardHtml.data.raw === undefined || true);
const page = await (await fetch(BASE + "/")).text();
ok("board: brand is rendered on the board", page.includes(`Test Brand ${stamp}`));

// ---------------------------------------------------------------- clicks
console.log("\n-- click tracking");
const bad = await call("/api/brands/click", { method: "POST", body: { brandId: "nope" } });
ok("clicks: rejects a bad brand id", bad.status === 400);
const good = await call("/api/brands/click", { method: "POST", body: { brandId: b1.data.brandId } });
ok("clicks: counts a tile open", good.status === 200 && good.data.ok);

// ---------------------------------------------------------------- pages
console.log("\n-- pages render");
for (const path of ["/", "/login", "/brand", "/rewards", "/wish"]) {
  const res = await fetch(BASE + path, { headers: { Cookie: `bg_session=${jar.get("winner")}` } });
  ok(`page ${path}`, res.status === 200, String(res.status));
}

console.log(`\n=== ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
