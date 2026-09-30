/**
 * Brand Corner and Brand Drops — both concept previews with exactly one
 * real piece of backend behind them: interest capture. The assertions here
 * weight toward that, since it's the one thing that can actually be wrong
 * in a way that matters (double-counting a visitor, leaking one visitor's
 * signal into another's dedupe). Everything else is presentation.
 *
 *   PGURL=... BASE=http://localhost:3000 node scripts/upcomingtest.mjs
 */
import { execSync } from "child_process";
import { LISTING_FEE_PAISE, rupees } from "../lib/rules.ts";

const BASE = process.env.BASE ?? "http://localhost:3000";
const PGURL = process.env.PGURL;
if (!PGURL || !/localhost|127\.0\.0\.1/.test(PGURL)) {
  console.error("PGURL must be set and point at the local database.");
  process.exit(1);
}

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

const stamp = Date.now().toString(36);
const slug = `test-brand-${stamp}`;

// A visitor is just a cookie — no account needed for interest capture, so
// this drives the endpoint directly rather than through a browser.
async function callAs(vidCookie, body) {
  const res = await fetch(`${BASE}/api/interest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(vidCookie ? { Cookie: `bg_vid=${vidCookie}` } : {}) },
    body: JSON.stringify(body),
  });
  const setCookie = (res.headers.getSetCookie?.() ?? []).join(";");
  const newVid = /bg_vid=([^;]+)/.exec(setCookie)?.[1];
  return { status: res.status, data: await res.json().catch(() => ({})), newVid };
}

console.log(`\n=== Brand Corner / Brand Drops — ${BASE}\n`);

// ------------------------------------------------------------ validation
console.log("-- what the endpoint refuses");

let r = await callAs(undefined, { module: "not-a-module", targetSlug: slug });
ok("interest: an unknown module is refused", r.status === 400, r.data.error);

r = await callAs(undefined, { module: "corner", targetSlug: "" });
ok("interest: a missing target is refused", r.status === 400, r.data.error);

r = await callAs(undefined, { module: "corner" });
ok("interest: a missing body field is refused, not a 500", r.status === 400, r.data.error);

// ------------------------------------------------------------ the real thing
console.log("\n-- registering and deduping interest");

const first = await callAs(undefined, { module: "corner", targetSlug: slug });
ok("interest: a first-time visitor is accepted", first.status === 200 && first.data.count === 1, JSON.stringify(first.data));
ok("interest: a visitor cookie is issued", Boolean(first.newVid), first.newVid ?? "(none)");
const vidA = first.newVid;

ok("interest: exactly one row exists for this visitor and target",
  q(`select count(*) from interest_signals where module='corner' and target_slug='${slug}' and visitor_id='${vidA}'`) === "1");

const repeat = await callAs(vidA, { module: "corner", targetSlug: slug });
ok("interest: the same visitor registering again doesn't double-count",
  repeat.status === 200 && repeat.data.count === 1, JSON.stringify(repeat.data));
ok("interest: and still exactly one row",
  q(`select count(*) from interest_signals where module='corner' and target_slug='${slug}'`) === "1");

// A second, genuinely different visitor.
const second = await callAs(undefined, { module: "corner", targetSlug: slug });
ok("interest: a second visitor is counted separately",
  second.status === 200 && second.data.count === 2, JSON.stringify(second.data));
ok("interest: two distinct visitor rows exist",
  q(`select count(distinct visitor_id) from interest_signals where module='corner' and target_slug='${slug}'`) === "2");

// The same visitor can register on a DIFFERENT target without being blocked
// by the first — dedupe is per (module, target, visitor), not per visitor.
const otherTarget = await callAs(vidA, { module: "corner", targetSlug: `${slug}-other` });
ok("interest: the same visitor can register on a different target",
  otherTarget.status === 200 && otherTarget.data.count === 1, JSON.stringify(otherTarget.data));

// Modules don't bleed into each other.
const dropsCount = q(`select count(*) from interest_signals where module='drops' and target_slug='${slug}'`);
ok("interest: registering under 'corner' didn't also write to 'drops'", dropsCount === "0");

// ------------------------------------------------------------ pages render
console.log("\n-- pages render, and say what they are");

const corner = await fetch(`${BASE}/corner`).then((r) => r.text());
ok("corner: the page loads", corner.length > 0);
ok("corner: every brand is marked Upcoming", (corner.match(/Upcoming/g) ?? []).length >= 6);
ok("corner: says this is a concept preview", /concept preview/i.test(corner));
ok("corner: the flat-fee board language doesn't leak in by accident",
  !corner.includes(`List for ${rupees(LISTING_FEE_PAISE)}`));

const oneCorner = await fetch(`${BASE}/corner/sawari`).then((r) => r.text());
ok("corner/[slug]: a known brand's page renders", /Sawari/.test(oneCorner));
ok("corner/[slug]: offers a copy-link action", /Copy this link/.test(oneCorner));

const missing = await fetch(`${BASE}/corner/not-a-real-brand-${stamp}`);
ok("corner/[slug]: an unknown slug 404s rather than crashing", missing.status === 404);

const drops = await fetch(`${BASE}/drops`).then((r) => r.text());
ok("drops: the page loads", drops.length > 0);
ok("drops: says this is a concept preview", /concept preview/i.test(drops));
ok("drops: the mystery drop's actual contents stay hidden",
  !drops.includes("Nobody knows what's in this one"));
ok("drops: shows all four drop kinds", ["Reward drop", "Merchandise drop", "Mystery box", "Game drop"].every((k) => drops.includes(k)));

const home = await fetch(`${BASE}/`).then((r) => r.text());
ok("home: points at both previews", /Brand Corner/.test(home) && /Brand Drops/.test(home));

const nav = await fetch(`${BASE}/wish`).then((r) => r.text()); // any page carries the shared nav
ok("nav: both links carry the Soon mark, not the Try-it mark", (nav.match(/navsoon/g) ?? []).length >= 2);

// ------------------------------------------------------------ cleanup
q(`delete from interest_signals where target_slug like 'test-brand-${stamp}%'`);
console.log("\n-- cleaned up");

console.log(`\n=== ${pass} passed, ${fail} failed\n`);
process.exitCode = fail ? 1 : 0;
