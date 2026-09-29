/**
 * The fixed reviewer sign-in.
 *
 * It's a hole in the front door, so the assertions that matter are the ones
 * proving how narrow it is: one address, one code, no account creation, and
 * no effect whatsoever on how a real emailed code is checked.
 *
 *   PGURL=... node --env-file=.env.local scripts/reviewlogintest.mjs
 */
import { execSync } from "child_process";

const BASE = process.env.BASE ?? "http://localhost:3000";
const PGURL = process.env.PGURL;
const EMAIL = process.env.REVIEW_LOGIN_EMAIL;
const CODE = process.env.REVIEW_LOGIN_CODE;

if (!PGURL || !/localhost|127\.0\.0\.1/.test(PGURL)) {
  console.error("PGURL must point at the local database.");
  process.exit(1);
}
if (!EMAIL || !CODE) {
  console.error("REVIEW_LOGIN_EMAIL / REVIEW_LOGIN_CODE not set — run with --env-file=.env.local");
  process.exit(1);
}

let pass = 0, fail = 0;
const ok = (n, c, x = "") => {
  if (c) pass++;
  else fail++;
  console.log(`${c ? "  ok  " : "FAIL  "}${n}${x ? "  — " + x : ""}`);
};
const q = (sql) =>
  execSync(`psql "$PGURL" -t -A -F'|' -c ${JSON.stringify(sql.replace(/\s+/g, " ").trim())}`,
    { env: { ...process.env, PGURL }, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();

const verify = async (email, code) => {
  const res = await fetch(`${BASE}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  const setCookie = (res.headers.getSetCookie?.() ?? []).join(";");
  return { status: res.status, data: await res.json().catch(() => ({})), session: /bg_session=([^;]+)/.exec(setCookie)?.[1] };
};

console.log(`\n=== reviewer sign-in — ${BASE}\n`);

// The account has to exist already; make sure it does for this run.
const existed = q(`select id from users where email = '${EMAIL}'`);
if (!existed) q(`insert into users (email, role) values ('${EMAIL}', 'merchant')`);

let r = await verify(EMAIL, CODE);
ok("the fixed code signs the reviewer in", r.status === 200 && Boolean(r.session), `status=${r.status}`);
ok("and the session actually works", r.session
  ? (await fetch(`${BASE}/brand`, { headers: { Cookie: `bg_session=${r.session}` } })).status === 200
  : false);

// ---- everything that must NOT work
console.log("\n-- the ways in that must stay shut");

r = await verify(EMAIL, "000000");
ok("a wrong code for the same address is refused", r.status === 401 && !r.session, `status=${r.status}`);

r = await verify(EMAIL, CODE.slice(0, 5));
ok("a truncated code is refused", r.status === 401 && !r.session);

r = await verify(EMAIL, CODE + "0");
ok("a padded code is refused", r.status === 401 && !r.session);

const other = `rl-other-${Date.now().toString(36)}@brandgenie.test`;
r = await verify(other, CODE);
ok("the same code on another address is refused", r.status === 401 && !r.session, `status=${r.status}`);
ok("and that address was NOT created as a side effect",
  q(`select count(*) from users where email = '${other}'`) === "0");

// The guard that stops a typo'd env var minting an account.
const ghost = `rl-ghost-${Date.now().toString(36)}@brandgenie.test`;
r = await verify(ghost, CODE);
ok("an address with no account can't be conjured by the code",
  r.status === 401 && q(`select count(*) from users where email = '${ghost}'`) === "0");

// ---- the real path is untouched
console.log("\n-- the real emailed-code path is unchanged");

const normal = `rl-normal-${Date.now().toString(36)}@brandgenie.test`;
await fetch(`${BASE}/api/auth/request-otp`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: normal }),
});
await new Promise((r) => setTimeout(r, 600));
ok("a normal address still gets a code issued",
  Number(q(`select count(*) from otp_codes where email = '${normal}'`)) > 0);

r = await verify(normal, CODE);
ok("the reviewer code does not open a normal account", r.status === 401 && !r.session);

r = await verify(normal, "123456");
ok("a wrong guess on a normal account is still refused", r.status === 401 && !r.session);

// cleanup
q(`delete from users where email like 'rl-%@brandgenie.test'`);
q(`delete from otp_codes where email like 'rl-%@brandgenie.test'`);
if (!existed) q(`delete from users where email = '${EMAIL}'`);
console.log("\n-- cleaned up");

console.log(`\n=== ${pass} passed, ${fail} failed\n`);
process.exitCode = fail ? 1 : 0;
