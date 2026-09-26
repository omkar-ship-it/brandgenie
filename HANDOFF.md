# BrandGenie — project context

Written 2026-09-25, at the end of the session that built the MVP. The README
is the public-facing doc; this one is the working context: why things are the
way they are, what's been verified, what's still open, and the traps already
hit so nobody re-hits them.

---

## 1. Where this came from

BrandGenie is the second repo in this thread of work.

**ViralGenie** (`github.com/omkar-ship-it/viralgenie`, `~/Documents/viralgenie`)
was the exploratory prototype — roughly twelve commits of adapting outbid.lol's
pay-to-rank mechanic onto LoyalGenie. It accumulated a lot: rotating brand
grids, a games library, wish upvotes, category leaderboards, two A/B'd
Brandboard layouts. It still exists and still runs. Nothing here depends on it.

**BrandGenie** (this repo) is a deliberate restart with a narrow brief: the
thing you put in front of a brand to get them to sign up. The scope was set
explicitly — *no landing page, no explainer copy*. Brands bid and land on the
grid; customers get one round a day; both authenticate with email OTP; rewards
can be passed to friends and expire; wishes open at 11:11. That's the whole
product surface.

The most important idea carried over from ViralGenie, and the one to protect:

> **Money buys visibility, never odds.**

A bid decides where a brand sits on the board. It has no effect whatsoever on
where the genie stops. If a future feature makes a bid change a customer's
chances, the product has quietly become a paid lottery — that's the line.

---

## 2. Product rules, and why each one exists

These are decisions, not implementation accidents. Changing one changes the
product.

**One round per customer per day.** Enforced by a unique index on
`plays(user_id, day_key)`, not by application logic that could race. The
scarcity is the whole hook — it's what makes people come back daily and what
makes a board position worth paying for.

**The round resolves entirely on the server.** `POST /api/play` decides the
start, the number of steps, where he lands, and what you win, then returns all
of it. The browser only animates a result that already happened. A player
cannot choose where he stops, replay the day, or learn the outcome early.

**The genie walks past empty shelves.** If the tile he'd land on has no stock
left, he keeps stepping until he finds one that does. This was a real
playtest finding in ViralGenie: on a once-daily mechanic, landing on nothing
doesn't read as bad luck, it reads as a broken app that wasted your one go.

**He starts from the same place for everyone each day.** `genieStart()` hashes
the day key, so the starting tile is a shared daily fact rather than a private
roll. It makes the round feel like an event.

**Gifting is final.** This is the rule the user asked for in these words: *"If
they share it with friends, then they can't redeem it."* Implemented as a
status flip to `gifted`, which is exactly what the redeem route checks. The
grant stays visible in the sender's list marked "Sent away" rather than
vanishing, so the act has a visible consequence. The friend claims through an
emailed link and takes ownership (`user_id` transfers, status returns to
`active`).

**Every reward expires.** Each brand sets `valid_days` per reward; the expiry
is stamped onto the grant at the moment it's won, not read live from the
brand's current setting — so a brand editing their listing can't retroactively
shorten a reward someone already holds.

**Wishes open only in the 11:11 minute, IST, twice a day, two per person.**
Literally that minute — 11:11am and 11:11pm. The browser countdown is a hint;
`isWishWindowOpen()` is re-checked server-side in the route, so a clock-skewed
or tampered client gets a 403.

**Board order is derived, never stored.** `getBoard()` sorts live by
`bid_paise desc, bid_at asc` and assigns positions 1..50 on read. So a new bid
re-ranks everyone with no gaps and no backfill job. `bid_at` breaks ties in
favour of whoever got there first.

---

## 3. Architecture

Next.js 16 App Router · TypeScript · Tailwind v4 (CSS-based `@theme`, no JS
config) · Drizzle ORM · Postgres · MSG91 email · Razorpay payments.

**Database driver switch** (`lib/db/index.ts`): a `neon.tech` host uses
`@neondatabase/serverless` over HTTP; anything else uses node-postgres with a
pool cached on `globalThis` to survive dev hot-reloads. `hasDb` is exported so
every route and page can degrade instead of throwing when no database is
configured.

**Auth** is hand-rolled email OTP, copied in shape from LetterMail
(`~/Projects/letterbox`) — no NextAuth. Three tables: `users`, `otp_codes`
(scrypt-hashed, single-use, 10-minute expiry), `sessions` (the row id *is* the
opaque bearer token, stored in the `bg_session` httpOnly cookie for 30 days).
Same flow for brands and customers; a brand is just a user who has a `brands`
row.

**Payments**: `lib/razorpay.ts` creates real orders via the Orders API and
verifies the `order_id|payment_id` HMAC-SHA256 signature with a constant-time
compare. Only `POST /api/bids/verify` writes `brands.bid_paise` — it is the
sole writer of the value the board ranks by, which is what keeps the payment
path authoritative.

**Graceful degradation is a feature, not a stopgap.** With MSG91 unset, OTP and
gift emails print to the server console. With Razorpay unset, `createOrder`
returns a `mock_order_<id>` and `verifySignature` accepts *only* that prefix.
Both are visibly labelled in the UI. This is what lets the whole product be
demoed with zero credentials, and it's why the local dev loop needs no
secrets at all.

**Time** is anchored to IST throughout (`lib/rules.ts`, `IST_OFFSET_MINUTES`),
so the daily reset and the 11:11 window mean the same thing regardless of where
the server or the player is.

### File map

```
lib/
  db/schema.ts      users, otp_codes, sessions, brands, rewards, bids,
                    plays, grants, wishes
  db/index.ts       Neon-vs-pg driver switch, `hasDb`
  passcode.ts       scrypt hash/verify
  otp.ts            code generation, hashing, expiry constant
  session.ts        create/set/get/destroy; cookie name `bg_session`
  email.ts          MSG91 v5 template send + console fallback
  razorpay.ts       order creation, signature verification, mock mode
  rules.ts          all tunable constants, IST helpers, genieStart()
  board.ts          getBoard() (the derived ranking), getBrandForUser()

app/api/
  auth/request-otp, auth/verify-otp, auth/logout (303 redirect — posted
    from a plain <form> in the nav)
  brand                 upsert listing + reward
  bids/create-order     validates amount, writes bid ledger row
  bids/verify           checks signature, then moves brands.bid_paise
  play                  the whole round
  rewards/gift          status → gifted, emails claim link
  rewards/claim         friend takes ownership
  rewards/redeem        blocks gifted and expired
  wishes                11:11 gate + 2/day cap

app/                page.tsx (board) · brand · rewards · r/[code] · wish · login
components/         Board · BrandConsole · RewardList · ClaimButton · WishWindow
scripts/seed.mjs    20 demo brands + 6 wishes; `-- wipe` clears them
```

### Tunables

All in `lib/rules.ts`: `BOARD_SIZE` 50, `BID_BASE_PAISE` and `BID_STEP_PAISE`
both ₹100, `WISHES_PER_DAY` 2, `DEFAULT_REWARD_VALID_DAYS` 14,
`WALK_MIN_STEPS` 9 / `WALK_MAX_STEPS` 22, and the six categories with their
icons and accent colours.

---

## 4. What's been verified, and how

Local Postgres database `brandgenie`, schema pushed, 20 brands seeded. Lint
clean, production build clean.

Driven end to end via the API with a cookie jar (script was throwaway; the
sequence is what matters):

1. Customer requests OTP → code read from the dev-server log → verified, session set
2. `POST /api/play` → won "Three classes free" from Stretch Studio, code returned
3. Second `POST /api/play` → **409**, already played today
4. Gift the code to `friend@test.local` → ok, claim URL returned
5. Giver tries to redeem → **refused**, "You sent this to a friend — it's theirs now"
6. Friend signs in, claims → ok; friend redeems → ok
7. Wish outside the window → **403**, "Wishes only open at 11:11."
8. Brand signs in, saves a listing, creates an order for ₹50,000, verifies → board re-ranks it to #1

Driven through a real browser (Playwright, headless Chromium) for the visuals:
board at rest, mid-walk, prize state, rewards list, gift sheet, wish page,
brand console, and a 390px mobile pass. Zero page errors.

The 11:11 open state can't be waited for, so it was checked by temporarily
making `isWishWindowOpen()` return true, posting a wish through the UI
(counter dropped to "1 of 2 left", the wish appeared in both lists), then
reverting the override. **If you need to check that screen again, do the same
thing — do not add a permanent env-var override, because a flag that can force
the window open in production defeats the point of the mechanic.**

Screenshots from the session are in the scratchpad and will not survive;
re-shoot if needed.

---

## 5. Open items — the actual next steps

**Blocking the Vercel deploy:**

1. **Neon database.** Create it, set `DATABASE_URL` in Vercel, run
   `npm run db:push` once against it. Nothing works without this — every page
   degrades to an empty state, which is worse than an error for a demo.
2. **MSG91 gift template doesn't exist yet.** OTP email is done (2026-09-26):
   template id `brandgenie`, on the same MSG91 account as LetterMail, sending
   from `otp@mail.loyalgenie.in` — a live send to a real inbox returned 2xx.
   The gift template still needs creating in the MSG91 console with merge tags
   `sender_name`, `reward`, `claim_link`, then `MSG91_GIFT_TEMPLATE_ID` set.
   Until then gift claim links only appear in the server log — fine for a
   demo, broken for real customers.
3. **Razorpay keys** whenever live bids are wanted. Test mode is visibly
   labelled and confirms bids without payment, so the bid flow demos fine
   without them.

**A decision that needs making before the first brand meeting:** the seed data
is 20 invented brands with links on the reserved `.example` TLD. That was
deliberate — several ViralGenie brand names matched real Bengaluru businesses,
and putting a real shop's name and Instagram on a live board implies they've
signed up when they haven't. Either keep the invented ones and say plainly
they're placeholders, or seed only brands who've actually agreed.

**Not built, not scoped, worth considering later:** brands can't see who won
their rewards or mark a code as used in-store (right now "redeem" is the
customer tapping a button, which is fine for a demo and not fine for a real
merchant); nothing grants a wish yet — wishes are collected and displayed but
there's no path from a wish to a brand fulfilling it; no rate limiting on OTP
requests; no admin view.

---

## 6. Traps already hit

Worth reading before touching the relevant area.

**React Compiler lint is strict and it runs on `npm run lint`.** Three rules
bit repeatedly: no `Math.random()` or `Date.now()` called inside a component
body (move to module scope, or into a helper in a non-component file — that's
why `isExpired()` lives in `lib/rules.ts`); no reading `ref.current` during
render; no bare `setState` in an effect body. Server components are not exempt
from the purity rule even though the concern doesn't apply to them.

**Measuring the board needs a callback ref, not a mount effect.** The genie
token is positioned from a measured cell size and the live column count (the
grid reflows 10→5 columns under 720px). A `useEffect` on mount fired before
the board existed and got a null ref. `ResizeObserver` attached through a
callback ref is what works. Two earlier versions of this bug shipped in
ViralGenie: token math that ignored grid gaps, and a `top` computed as a
percentage of board height.

**The genie was invisible even when correctly positioned** — a 22px emoji
centred behind a brand's logo mark. He now stands at the foot of the tile with
a ring lighting up the tile around him. Worth remembering that "the element is
at the right coordinates" and "a person can see it" are different tests, and
only a screenshot settles the second one.

**`playedToday` comes from the server and goes stale in-tab.** After a round
finishes, the button state has to come from local state too, or the player can
click again and get a 409 in the face.

**Small ones:** HTML entities inside JS string literals print literally — use
real `’` characters; JSX drops the space between `{expr}` and a following
newline word, so `{" "}` is needed; `rm -rf .next` after moving a page file,
because route types go stale; Drizzle's `.returning({...})` with column
arguments fails to typecheck when `db` is a union of the Neon and pg driver
types — call `.returning()` bare.

---

## 7. Local setup, from cold

```bash
cd ~/Documents/brandgenie
npm install
createdb brandgenie                  # already exists on this machine
cp .env.example .env.local           # DATABASE_URL is the only required var
npm run db:push
npm run db:seed                      # add `-- wipe` to clear demo data first
npm run dev
```

No secrets needed. OTP codes appear in the dev server output as
`[otp] MSG91 not configured — login code for <email> is 123456`; that's how
every sign-in was tested.

`.env.local` is gitignored; `.env.example` is committed as the template.
