# BrandGenie

Brands bid for one of 50 places on a board. Once a day a genie walks that board
and stops on a brand, and whoever woke him walks away with that brand's reward.
Twice a day, at 11:11 exactly, customers can leave a wish for brands to grant.

This is the MVP built for brand onboarding demos — no marketing site, no
explainer copy, just the four screens a brand needs to see working.

Working context — why things are the way they are, what's verified, and
what's still open — is in [HANDOFF.md](HANDOFF.md).

## The rules the product runs on

- **A bid buys visibility, never odds.** Position on the board is purely the
  bid, highest first, ties to whoever got there first. The genie's walk is the
  same for every brand on it. Nothing in the payment path touches the draw.
- **One round per customer per day**, enforced by a unique index on
  `(user_id, day_key)`. The whole round — start, steps, landing, prize — is
  decided on the server; the browser only animates what came back.
- **He won't stop on an empty shelf.** If the tile he'd land on has no stock
  left he keeps walking, so the one round a day isn't wasted on nothing.
- **Gifting is final.** Sending a reward to a friend flips it to `gifted`,
  which is exactly what stops the sender redeeming it. The friend claims it
  with the emailed link and it becomes theirs.
- **Every reward expires**, on a window each brand sets per reward.
- **Wishes open at 11:11 IST**, morning and night, two per person per day. The
  countdown in the browser is a hint; the gate is checked on the server.

## Screens

| Route | What it is |
| --- | --- |
| `/` | The board, plus the daily Genie's Round |
| `/brand` | Brand listing, reward setup, and the bid + payment flow |
| `/rewards` | What you've won: codes, expiry, redeem, gift |
| `/r/[code]` | A friend claiming a gifted reward |
| `/wish` | The 11:11 window and the wish feed |
| `/login` | Email OTP, for brands and customers alike |

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Drizzle ORM · Postgres
(Neon in production, local `pg` in dev) · MSG91 for email · Razorpay for
payments.

Auth is hand-rolled email OTP, the same shape as LetterMail: a six-digit code
hashed with scrypt, single-use, valid ten minutes; the session is an opaque
UUID in an httpOnly cookie for 30 days.

## Running it locally

```bash
npm install
createdb brandgenie                 # or point DATABASE_URL anywhere
cp .env.example .env.local          # then point DATABASE_URL at your db
npm run db:push                     # create the tables
npm run db:seed                     # 20 demo brands + a few wishes
npm run dev
```

With MSG91 unset, login codes print to the server console instead of being
emailed — the whole flow stays testable. With Razorpay unset, bidding runs in
a clearly labelled test mode that confirms the bid without taking a payment.
**No card details are collected, handled, or stored anywhere in this codebase**
— live payments go through Razorpay's hosted checkout.

`npm run db:seed -- wipe` clears the demo brands before re-seeding.

## Deploying to Vercel

Import the repo, then set these environment variables:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon connection string (a `neon.tech` host switches to the HTTP driver automatically) |
| `RAZORPAY_KEY_ID` | for live bids | Leave unset for test mode |
| `RAZORPAY_KEY_SECRET` | for live bids | Used to verify `order_id\|payment_id` signatures |
| `MSG91_AUTH_KEY` | for real email | Leave unset and codes go to the server log |
| `MSG91_EMAIL_DOMAIN` | for real email | Verified sending domain |
| `MSG91_FROM_EMAIL` | for real email | |
| `MSG91_FROM_NAME` | no | Defaults to "BrandGenie" |
| `MSG91_EMAIL_TEMPLATE_ID` | for real email | OTP template, merge tag `{{OTP_CODE}}` |
| `MSG91_GIFT_TEMPLATE_ID` | for gift email | Merge tags `{{sender_name}}`, `{{reward}}`, `{{claim_link}}` |

Then run `npm run db:push` once against the production database.

## A note on the seed data

The demo brands are invented, and their links point at the reserved `.example`
TLD on purpose. Putting a real shop's name and Instagram on a live board would
imply they'd signed up when they haven't.
