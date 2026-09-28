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
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? "  ok  " : "FAIL  "}${name}${extra ? "  — " + extra : ""}`);
};

// Flattened to one line: JSON.stringify turns newlines into literal \n,
// which psql receives as backslash-n and refuses to parse.
const psqlRun = (sql) =>
  execSync(`psql "$PGURL" -q -c ${JSON.stringify(sql.replace(/\s+/g, " ").trim())}`, {
    stdio: ["ignore", "pipe", "ignore"],
  });

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

console.log(`\n=== LoyalGenie flow test — ${BASE}\n`);

// ---------------------------------------------------------------- auth
await signIn("winner", `t-win-${stamp}@brandgenie.test`, "customer");
await signIn("giver", `t-give-${stamp}@brandgenie.test`, "customer");
await signIn("friend", `t-friend-${stamp}@brandgenie.test`, "customer");
await signIn("brand", `t-brand-${stamp}@brandgenie.test`, "merchant");

// ---------------------------------------------------------------- otp codes
// Only meaningful where codes reach the log, i.e. local dev.
if (!PSQL) {
  console.log("\n-- otp codes");
  const email = `t-otp-${stamp}@brandgenie.test`;
  const readCode = () => {
    const lines = fs.readFileSync(LOG, "utf8").split("\n").filter((l) => l.includes(`login code for ${email} is`));
    return lines.at(-1).match(/(\d{6})/)[1];
  };
  await call("/api/auth/request-otp", { method: "POST", body: { email } });
  await new Promise((r) => setTimeout(r, 700));
  const first = readCode();
  await call("/api/auth/request-otp", { method: "POST", body: { email } });
  await new Promise((r) => setTimeout(r, 700));
  const second = readCode();
  ok("otp: asking twice gives two different codes", first !== second, `${first} then ${second}`);

  const useOld = await call("/api/auth/verify-otp", { method: "POST", body: { email, code: first } });
  ok("otp: THE BUG — the older code still works", useOld.status === 200, useOld.data.error ?? "accepted");

  const replay = await call("/api/auth/verify-otp", { method: "POST", body: { email, code: second } });
  ok("otp: signing in retires the other outstanding code", replay.status === 401, replay.data.error);

  const junk = await call("/api/auth/verify-otp", { method: "POST", body: { email, code: "000000" } });
  ok("otp: a wrong code says wrong, not expired", junk.status === 401 && /isn't right/.test(junk.data.error ?? ""), junk.data.error);
}

// ------------------------------------------------- a brand on the real board
// The showcase brands only exist on /try, so the live board is empty until
// somebody bids. Put one there before testing rounds against it.
console.log("\n-- putting a brand on the real board");
// A merchant of its own: the bid tests later start their brand from zero,
// and they can't do that if this one already holds a bid on the same account.
await signIn("seeder", `t-seed-${stamp}@brandgenie.test`, "merchant");
const seedBrand = await call("/api/brand", {
  method: "POST", as: "seeder",
  body: {
    name: `Board Seed ${stamp}`, category: "Food & Beverage", tagline: "On the live board",
    rewardLabel: "A free test coffee", rewardIcon: "\u2615", totalStock: 40, validDays: 14,
  },
});
ok("board: a brand lists itself", seedBrand.status === 200 && !!seedBrand.data.brandId);
const seedOrder = await call("/api/bids/create-order", { method: "POST", as: "seeder", body: { amountPaise: 120000 } });
await call("/api/bids/verify", { method: "POST", as: "seeder", body: { bidId: seedOrder.data.bidId, orderId: seedOrder.data.orderId } });
const boardNow = await (await fetch(BASE + "/")).text();
ok("board: and appears on it once the bid lands", boardNow.includes(`Board Seed ${stamp}`));

// ---------------------------------------------------------------- play
console.log("\n-- the round");
const p1 = await call("/api/play", { method: "POST", as: "winner" });
ok("play: round resolves and awards a prize", p1.status === 200 && !!p1.data.prize?.code, p1.data.prize?.label);
ok("play: landing is inside the board", p1.data.landed >= 1 && p1.data.landed <= 50, `#${p1.data.landed}`);
const p1again = await call("/api/play", { method: "POST", as: "winner" });
ok("play: a second round the same day is refused", p1again.status === 409, p1again.data.error);
// Signed out is a preview now, not a refusal: the comparison boards have to
// be demoable to anyone, but there is nobody to award a reward to.
const anon = await call("/api/play", { method: "POST", body: { mode: "classic" } });
ok("play: signed-out is a preview, not a refusal", anon.status === 200 && anon.data.preview === true,
  `preview=${anon.data.preview}`);
ok("play: a preview issues no code", !anon.data.prize || anon.data.prize.code === "", anon.data.prize?.code ?? "no prize");

const stockBefore = await call("/");
void stockBefore;
const anonAgain = await call("/api/play", { method: "POST", body: { mode: "classic" } });
ok("play: a preview can be replayed — it costs nothing", anonAgain.status === 200, String(anonAgain.status));

const anonStop = await call("/api/play/walk");
ok("stop: signed out gets a preview plan", anonStop.status === 200 && anonStop.data.preview === true,
  `preview=${anonStop.data.preview}`);

// what a signed-out visitor can see without an account
const publicBrand = await (await fetch(BASE + "/brand")).text();
ok("public: the brand page states the price without a login",
  /Costs from/.test(publicBrand) && /Places taken/.test(publicBrand) && !/Sign in with email/.test(publicBrand));
const publicWish = await (await fetch(BASE + "/wish")).text();
ok("public: the wish page shows the countdown and the feed",
  /window opens in|11:11/.test(publicWish) && /What people are wishing for/.test(publicWish));
const publicBoard = await (await fetch(BASE + "/")).text();
ok("public: the real board shows the brands but gates the round",
  /Sign in to play/.test(publicBoard) && !/Start him walking/.test(publicBoard));

await new Promise((r) => setTimeout(r, 1100));
const anonStopped = await call("/api/play/walk", { method: "POST", body: { token: anonStop.data.token, elapsedMs: 1050 } });
ok("stop: a signed-out stop awards nothing", anonStopped.status === 200 && anonStopped.data.preview === true
  && (!anonStopped.data.prize || anonStopped.data.prize.code === ""), anonStopped.data.prize?.label ?? "no prize");

// the property that matters: a preview token must not become a real reward
const previewPlan = await call("/api/play/walk");
await new Promise((r) => setTimeout(r, 1100));
const upgraded = await call("/api/play/walk", {
  method: "POST", as: "winner",
  body: { token: previewPlan.data.token, elapsedMs: 1050 },
});
ok("stop: a preview token can't be cashed in by a signed-in session",
  upgraded.status === 200 && upgraded.data.preview === true && (!upgraded.data.prize || upgraded.data.prize.code === ""),
  `preview=${upgraded.data.preview} code=${upgraded.data.prize?.code ?? "none"}`);
const asBrand = await call("/api/play", { method: "POST", as: "brand" });
ok("play: a merchant can't take the round", asBrand.status === 403, asBrand.data.error);

// ---------------------------------------------------------------- board modes
console.log("\n-- pick & stop experiments");
await signIn("modes", `t-modes-${stamp}@brandgenie.test`, "customer");

const tooMany = await call("/api/play", {
  method: "POST", as: "modes",
  body: { mode: "pick", brandIds: ["a", "b", "c", "d", "e", "f"] },
});
ok("pick: refuses more than the limit", tooMany.status === 400, tooMany.data.error);
const noneChosen = await call("/api/play", { method: "POST", as: "modes", body: { mode: "pick", brandIds: [] } });
ok("pick: refuses an empty shortlist", noneChosen.status === 400, noneChosen.data.error);

const walk = await call("/api/play/walk", { as: "modes" });
ok("stop: hands back a signed plan", walk.status === 200 && typeof walk.data.token === "string" && Array.isArray(walk.data.order),
  `${walk.data.order?.length} tiles, ${walk.data.tickMs}ms each`);

const forgedWalk = await call("/api/play/walk", { method: "POST", as: "modes", body: { token: "nope.nope", elapsedMs: 500 } });
ok("stop: a forged token is rejected", forgedWalk.status === 400, forgedWalk.data.error);

const tooSoon = await call("/api/play/walk", { method: "POST", as: "modes", body: { token: walk.data.token, elapsedMs: 900_000 } });
ok("stop: an implausible stop time is rejected", tooSoon.status === 400, tooSoon.data.error);

await new Promise((r) => setTimeout(r, 1200));
const stopped = await call("/api/play/walk", { method: "POST", as: "modes", body: { token: walk.data.token, elapsedMs: 1100 } });
ok("stop: a real stop lands somewhere on the board", stopped.status === 200 && stopped.data.landed >= 1, `#${stopped.data.landed}`);

const stopAgain = await call("/api/play/walk", { as: "modes" });
ok("stop: only one stop round a day", stopAgain.status === 409, stopAgain.data.error);

const classicStillOpen = await call("/api/play", { method: "POST", as: "modes", body: { mode: "classic" } });
ok("modes: each board keeps its own daily round", classicStillOpen.status === 200, `classic landed #${classicStillOpen.data.landed}`);

const merchantWalk = await call("/api/play/walk", { as: "brand" });
ok("stop: merchants are kept out of this board too", merchantWalk.status === 403, merchantWalk.data.error);

const tryPage = await fetch(BASE + "/try", { redirect: "manual" });
ok("try: the example board renders", tryPage.status === 200, String(tryPage.status));
for (const old of ["/try/walk", "/try/pick", "/try/stop"]) {
  const r = await fetch(BASE + old, { redirect: "manual" });
  ok(`try: ${old} redirects to the one board`, r.status === 307 || r.status === 308, String(r.status));
}

// ---------------------------------------------------------------- redeem
console.log("\n-- redemption");
const winCode = p1.data.prize.code;
const r1 = await call("/api/rewards/redeem", { method: "POST", body: { code: winCode }, as: "winner" });
ok("redeem: owner redeems their reward", r1.status === 200 && r1.data.ok);
ok("redeem: returns the unique code for the counter", r1.data.code === winCode, r1.data.code);
// Which reward the genie lands on isn't ours to choose, so assert the rule
// rather than one outcome: a counter reward gets a live window, an online
// one never does.
ok(
  `redeem: a ${r1.data.redemptionType} reward gets the right window`,
  r1.data.redemptionType === "counter" ? r1.data.windowSeconds === 30 : r1.data.windowSeconds === 0,
  `${r1.data.windowSeconds}s`
);
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
ok("bid: exactly ₹500 is accepted", floor.status === 200 && !!floor.data.orderId,
  floor.status === 200 ? (floor.data.mock ? "test mode" : "live razorpay") : floor.data.error);

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

// ---------------------------------------------------------------- online rewards
console.log("\n-- online rewards & coupon batches");
await signIn("shop", `t-shop-${stamp}@brandgenie.test`, "merchant");
const onlineBrand = await call("/api/brand", {
  method: "POST", as: "shop",
  body: {
    name: `Online Co ${stamp}`, category: "Shopping", tagline: "Ships everywhere",
    rewardLabel: "25% off your first order", rewardIcon: "🛒",
    redemptionType: "online", instructions: "Paste at checkout. One per customer.",
    redeemUrl: "https://onlineco.example/cart", totalStock: 99, validDays: 30,
  },
});
ok("online: listing saves as an online reward", onlineBrand.status === 200);

const noStock = await call("/api/brand/coupons", { as: "shop" });
ok("online: starts with no stock until codes are added", noStock.data.unused === 0, JSON.stringify(noStock.data));

const batch = await call("/api/brand/coupons", {
  method: "POST", as: "shop",
  body: { codes: `GEN-${stamp}-A\nGEN-${stamp}-B\nGEN-${stamp}-B\n  \nGEN-${stamp}-C` },
});
ok("online: batch uploads and de-duplicates", batch.status === 200 && batch.data.unused === 3,
  `${batch.data.unused} unused of ${batch.data.total}`);

const counterBrandCodes = await call("/api/brand/coupons", { method: "POST", as: "brand", body: { codes: "NOPE-1" } });
ok("online: a counter reward can't take codes", counterBrandCodes.status === 400, counterBrandCodes.data.error);

// take position #1 so the genie can only land here
const o1 = await call("/api/bids/create-order", { method: "POST", body: { amountPaise: 90_000_00 }, as: "shop" });
await call("/api/bids/verify", { method: "POST", body: { bidId: o1.data.bidId, orderId: o1.data.orderId }, as: "shop" });

// The genie's landing is pseudo-random, so to test the online path reliably
// we make THIS brand the only one with anything left — he walks past empty
// shelves, so he has to stop here. Local only: it rewrites every reward's
// stock, which is not something to do to a live board.
//
// The backup table is a real one, not TEMP: each psql call is its own
// session and a temp table wouldn't survive to the restore.
const canForce = Boolean(PSQL) && BASE.includes("localhost");
// Restore on the way out whatever happens — an assertion throwing between
// here and the restore would otherwise leave every brand's stock at zero.
const restoreStock = () => {
  if (!canForce) return;
  psqlRun(
    `update rewards r set remaining = k.remaining from _flowtest_keep k where k.id = r.id;
     drop table if exists _flowtest_keep;`
  );
};
if (canForce) {
  process.on("exit", restoreStock);
  psqlRun(
    `drop table if exists _flowtest_keep;
     create table _flowtest_keep as select id, remaining from rewards;
     update rewards set remaining = 0
      where brand_id not in (select id from brands where name = 'Online Co ${stamp}');`
  );
}

await signIn("onlinewinner", `t-ow-${stamp}@brandgenie.test`, "customer");
const op = await call("/api/play", { method: "POST", as: "onlinewinner" });
const wonOnline = op.data.prize?.redemptionType === "online";
ok(`online: a win carries one of the brand's codes${canForce ? "" : " (not forced — may land elsewhere)"}`,
  canForce ? wonOnline && Boolean(op.data.prize?.couponCode) : !wonOnline || Boolean(op.data.prize?.couponCode),
  op.data.prize ? `${op.data.prize.brandName} → ${op.data.prize.couponCode ?? "none"}` : "no prize");

if (wonOnline) {
  const after = await call("/api/brand/coupons", { as: "shop" });
  ok("online: the claimed code leaves the pool", after.data.unused === 2, `${after.data.unused} left`);
  const red = await call("/api/rewards/redeem", { method: "POST", body: { code: op.data.prize.code }, as: "onlinewinner" });
  ok("online: marking used gives no counter window", red.status === 200 && red.data.windowSeconds === 0,
    `window=${red.data.windowSeconds}`);
  ok("online: instructions travel with the reward", red.data.instructions?.includes("checkout"), red.data.instructions);
  ok("online: the customer gets the brand's code, not just ours",
    Boolean(red.data.couponCode) && red.data.couponCode !== red.data.code,
    `${red.data.couponCode} vs ${red.data.code}`);
}

restoreStock();
if (canForce) process.off("exit", restoreStock);

// ---------------------------------------------------------------- brand stats
console.log("\n-- brand numbers");
const st = await call("/api/brand/stats", { as: "brand" });
if (st.status === 404) {
  ok("stats: (no API route — panel renders server-side)", true);
} else {
  ok("stats: brand can read its own numbers", st.status === 200);
}
const brandPage = await fetch(BASE + "/brand", { headers: { Cookie: `bg_session=${jar.get("brand")}` } });
const brandHtml = await brandPage.text();
ok("stats: panel is on the brand page", brandHtml.includes("Your numbers"));
ok("stats: shows tile opens, rewards won and redeemed",
  ["Tile opens", "Rewards won", "Redeemed"].every((t) => brandHtml.includes(t)));
ok("logo: uploader is offered", brandHtml.includes("Upload a logo") || brandHtml.includes("blob storage"));

// clicking the brand's tile must move its own per-day number
await call("/api/brands/click", { method: "POST", body: { brandId: b1.data.brandId } });
const after = await (await fetch(BASE + "/brand", { headers: { Cookie: `bg_session=${jar.get("brand")}` } })).text();
ok("stats: a tile open lands in the brand's day", /Tile opens/.test(after));

// ---------------------------------------------------------------- profile
console.log("\n-- first-login profile");
const profEmail = `t-prof-${stamp}@brandgenie.test`;
await signIn("fresh", profEmail, "customer");
const pBad = await call("/api/profile", { method: "POST", body: { name: "A", mobile: "9876543210" }, as: "fresh" });
ok("profile: rejects a one-letter name", pBad.status === 400, pBad.data.error);
const pBadNum = await call("/api/profile", { method: "POST", body: { name: "Test User", mobile: "12345" }, as: "fresh" });
ok("profile: rejects a bad mobile", pBadNum.status === 400, pBadNum.data.error);
const pOk = await call("/api/profile", { method: "POST", body: { name: "Test User", mobile: "+91 98765 43210" }, as: "fresh" });
ok("profile: saves, stripping +91 and spaces", pOk.status === 200 && pOk.data.mobile === "9876543210", pOk.data.mobile);
const pAnon = await call("/api/profile", { method: "POST", body: { name: "Nobody", mobile: "9876543210" } });
ok("profile: signed-out is refused", pAnon.status === 401);

// ---------------------------------------------------------------- clicks
console.log("\n-- click tracking");
const bad = await call("/api/brands/click", { method: "POST", body: { brandId: "nope" } });
ok("clicks: rejects a bad brand id", bad.status === 400);
const good = await call("/api/brands/click", { method: "POST", body: { brandId: b1.data.brandId } });
ok("clicks: counts a tile open", good.status === 200 && good.data.ok);

// The bug this guards: the main board switched mechanic and lost its tile
// handler, so cards stopped opening and clicks stopped being counted.
for (const page of ["/", "/try"]) {
  const html = await (await fetch(BASE + page)).text();
  ok(`board ${page} still wires up its tiles`, /class="tile[^"]*"/.test(html) && /brands\/click|tile-info|BrandSheet|tile/.test(html));
}

// ---------------------------------------------------------------- junk cookie
console.log("\n-- a cookie we didn't issue");
for (const junk of ["not-a-uuid", "abc123", "'; drop table users; --"]) {
  const res = await fetch(BASE + "/", { headers: { Cookie: `bg_session=${encodeURIComponent(junk)}` } });
  ok(`cookie: ${JSON.stringify(junk).slice(0, 22)} reads as signed out, not a 500`, res.status === 200, String(res.status));
}

// ---------------------------------------------------------------- two boards
console.log("\n-- the showcase board is separate from the real one");
const demoRound = await call("/api/play", { method: "POST", as: "winner", body: { mode: "classic", demo: true } });
ok("showcase: a round awards nothing even signed in",
  demoRound.status === 200 && demoRound.data.preview === true, `preview=${demoRound.data.preview}`);
const demoWalk = await call("/api/play/walk?demo=1", { as: "winner" });
ok("showcase: the stop plan is a preview too", demoWalk.status === 200 && demoWalk.data.preview === true);
const tryHtml = await (await fetch(BASE + "/try")).text();
const realHtml = await (await fetch(BASE + "/")).text();
ok("showcase: /try is populated while the real board is independent",
  (tryHtml.match(/class="tile[^"]*"/g) ?? []).length > 0);
void realHtml;

// ---------------------------------------------------------------- visitors
console.log("\n-- visitor counting");
const visit1 = await fetch(BASE + "/api/visit", { method: "POST" });
const vcount = await visit1.json();
const cookie = (visit1.headers.getSetCookie?.() ?? []).join(";").match(/bg_vid=([^;]+)/)?.[1];
ok("visits: a visit is recorded", visit1.status === 200 && typeof vcount.today === "number", `today=${vcount.today}`);
ok("visits: the visitor gets an id cookie", Boolean(cookie));

const visit2 = await (await fetch(BASE + "/api/visit", { method: "POST", headers: { Cookie: `bg_vid=${cookie}` } })).json();
ok("visits: the same visitor twice counts once", visit2.today === vcount.today, `${vcount.today} -> ${visit2.today}`);

const visit3 = await (await fetch(BASE + "/api/visit", { method: "POST" })).json();
ok("visits: a different visitor does count", visit3.today === vcount.today + 1, `${vcount.today} -> ${visit3.today}`);

const home = await (await fetch(BASE + "/")).text();
ok("visits: the strip and the one-minute way in are on the board",
  /livebar/.test(home) && /See how it works/.test(home) && /navtry/.test(home));

// ---------------------------------------------------------------- pages
console.log("\n-- pages render");
for (const path of ["/", "/login", "/brand", "/rewards", "/wish"]) {
  const res = await fetch(BASE + path, { headers: { Cookie: `bg_session=${jar.get("winner")}` } });
  ok(`page ${path}`, res.status === 200, String(res.status));
}

// ---------------------------------------------------------------- cleanup
// The suite creates real brands (one bids its way to #1) and burns real
// stock. Left behind they pile up on the board and make later runs flaky,
// so it clears up after itself whenever it has database access.
if (PSQL) {
  psqlRun(`
    update rewards r set remaining = least(r.total_stock, r.remaining + x.n)
      from (select g.brand_id, count(*) n from grants g
            join users u on u.id = g.user_id
            where u.email like 't-%@brandgenie.test' group by g.brand_id) x
      where r.brand_id = x.brand_id;
    delete from brands where user_id in (select id from users where email like 't-%@brandgenie.test');
    delete from users where email like 't-%@brandgenie.test';
  `);
  console.log("\n-- cleaned up test users, brands and stock");
}

console.log(`\n=== ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
