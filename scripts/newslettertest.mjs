/**
 * The newsletter signup — the one thing worth locking down is that it works
 * the same for a signed-out visitor and a signed-in customer, that a repeat
 * submission is a no-op rather than an error, and that an account link
 * survives a later signed-out resubscribe rather than being blanked out.
 *
 *   PGURL=... BASE=http://localhost:3000 node scripts/newslettertest.mjs
 */
import { execSync } from "child_process";

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
const emails = [];
process.on("exit", () => {
  for (const e of emails) {
    try { q(`delete from newsletter_subscribers where email = '${e}'`); } catch {}
    try { q(`delete from users where email = '${e}'`); } catch {}
  }
});

const subscribe = async (email, sid) => {
  const res = await fetch(`${BASE}/api/newsletter`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(sid ? { Cookie: `bg_session=${sid}` } : {}) },
    body: JSON.stringify({ email }),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};

console.log(`\n=== newsletter — ${BASE}\n`);

// ------------------------------------------------------------ validation
console.log("-- what it refuses");

let r = await subscribe("not-an-email");
ok("newsletter: a malformed address is refused", r.status === 400, r.data.error);

r = await subscribe("");
ok("newsletter: an empty address is refused, not a 500", r.status === 400, r.data.error);

// ------------------------------------------------------------ signed out
console.log("\n-- signed-out subscription");

const visitorEmail = `t-nl-visitor-${stamp}@brandgenie.test`;
emails.push(visitorEmail);
r = await subscribe(visitorEmail);
ok("newsletter: a signed-out visitor can subscribe with just an email", r.status === 200 && r.data.ok, JSON.stringify(r.data));
ok("newsletter: the row has no account attached",
  q(`select user_id is null from newsletter_subscribers where email = '${visitorEmail}'`) === "t");

r = await subscribe(visitorEmail);
ok("newsletter: subscribing again is a no-op, not an error", r.status === 200);
ok("newsletter: still exactly one row for that address",
  q(`select count(*) from newsletter_subscribers where email = '${visitorEmail}'`) === "1");

// ------------------------------------------------------------ signed in
console.log("\n-- signed-in subscription");

const customerEmail = `t-nl-customer-${stamp}@brandgenie.test`;
emails.push(customerEmail);
const sid = q(`with u as (insert into users (email, role) values ('${customerEmail}','customer') returning id)
  insert into sessions (user_id, expires_at) select id, now() + interval '2 hours' from u returning id;`).split("\n")[0];

r = await subscribe(customerEmail, sid);
ok("newsletter: a signed-in customer can subscribe", r.status === 200);
ok("newsletter: the row is linked to their account",
  q(`select u.email from newsletter_subscribers n join users u on u.id = n.user_id where n.email = '${customerEmail}'`) === customerEmail);

// A later signed-out resubscribe of the SAME address must not erase the
// account link a signed-in submission already set.
r = await subscribe(customerEmail);
ok("newsletter: a signed-out resubscribe of a linked address still succeeds", r.status === 200);
ok("newsletter: and does not blank out the existing account link",
  q(`select user_id is not null from newsletter_subscribers where email = '${customerEmail}'`) === "t");

// ------------------------------------------------------------ the count
console.log("\n-- the public count");

const before = Number(q(`select count(*) from newsletter_subscribers where unsubscribed_at is null`));
const freshEmail = `t-nl-fresh-${stamp}@brandgenie.test`;
emails.push(freshEmail);
r = await subscribe(freshEmail);
ok("newsletter: the count returned includes the new subscriber", r.data.count === before + 1, `${r.data.count} vs expected ${before + 1}`);

// ------------------------------------------------------------ pages
console.log("\n-- the homepage");

const homeOut = await fetch(`${BASE}/`).then((r) => r.text());
ok("home: signed out sees the signup form", /you@example\.com/.test(homeOut));
ok("home: the pitch mentions curated deals from brands", /curated deals/i.test(homeOut));

const asCustomer = await fetch(`${BASE}/`, { headers: { Cookie: `bg_session=${sid}` } }).then((r) => r.text());
ok("home: a signed-in customer's email prefills the field", asCustomer.includes(customerEmail));

const mEmail = `t-nl-merchant-${stamp}@brandgenie.test`;
emails.push(mEmail);
const msid = q(`with u as (insert into users (email, role) values ('${mEmail}','merchant') returning id)
  insert into sessions (user_id, expires_at) select id, now() + interval '2 hours' from u returning id;`).split("\n")[0];
const asMerchant = await fetch(`${BASE}/`, { headers: { Cookie: `bg_session=${msid}` } }).then((r) => r.text());
ok("home: a signed-in merchant does not see the newsletter pitch — they're the supply, not the audience",
  !/Get the good stuff first/.test(asMerchant));

const privacy = await fetch(`${BASE}/privacy`).then((r) => r.text());
ok("privacy: says what the newsletter collects", /subscribe to the newsletter/i.test(privacy));
ok("privacy: says how to withdraw consent", /withdraw/i.test(privacy));

console.log(`\n=== ${pass} passed, ${fail} failed\n`);
process.exitCode = fail ? 1 : 0;
