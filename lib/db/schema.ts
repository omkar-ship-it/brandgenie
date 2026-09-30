import { pgTable, text, timestamp, integer, uuid, uniqueIndex, boolean } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------- auth
// Same hand-rolled email-OTP shape as LetterMail: a user row appears on
// first successful verify, codes are hashed at rest, and the session id is
// itself the opaque bearer token stored in an httpOnly cookie.

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  // "customer" or "merchant" — chosen at sign-up, and what the nav keys off.
  // A customer who later lists a brand is promoted; nobody is demoted.
  role: text("role").notNull().default("customer"),
  // Asked once, on a customer's first sign-in, and never again. Null on
  // accounts created before this existed and on merchants, who give their
  // details through the brand listing instead.
  name: text("name"),
  mobile: text("mobile"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------- brands

/**
 * One brand per account. `bidPaise` is set once, to the flat listing fee,
 * after a payment is verified — never from the client, and never a second
 * time: paying doesn't move you up the board any more, so there's nothing
 * to re-pay for. Position is now decided by the `votes` table below.
 */
export const brands = pgTable("brands", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  category: text("category").notNull(),
  area: text("area").notNull().default(""),
  website: text("website"),
  instagram: text("instagram"),
  // Blob URL of an uploaded logo. Null falls back to the brand's initials,
  // so the board never has a hole in it.
  logoUrl: text("logo_url"),
  bidPaise: integer("bid_paise").notNull().default(0),
  /**
   * Showcase brands for the comparison boards. They are invisible to the
   * real board and their rewards are never handed out — without this flag
   * filling /try with fifty brands would also fill the board customers
   * actually play, which is the opposite of what a demo should do.
   */
  isDemo: boolean("is_demo").notNull().default(false),
  // How many people have opened this brand's card from the board — a
  // secondary engagement number, separate from the votes that rank it.
  clicks: integer("clicks").notNull().default(0),
  // When the listing fee was paid. Breaks ties between brands tied on votes
  // — whoever joined first keeps the higher rank until someone earns past
  // them, rather than a coin flip re-deciding it on every page load.
  bidAt: timestamp("bid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * What the brand gives away when the genie stops on them.
 *
 * `redemptionType` decides everything downstream — what the customer sees,
 * whether there's a timer, when the grant burns, and where stock comes from:
 *
 *   "counter" — shown to staff in person. Liveness is the proof, so the
 *               reward burns the moment it's displayed. Stock is just a
 *               number the brand sets.
 *   "online"  — pasted into the brand's own checkout. We can't see the
 *               moment it's used, so nothing burns on our side; the brand's
 *               batch of single-use codes IS the stock.
 */
export const rewards = pgTable("rewards", {
  id: uuid("id").defaultRandom().primaryKey(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  icon: text("icon").notNull().default("🎁"),
  redemptionType: text("redemption_type").notNull().default("counter"),
  // Shown on the reward card and, crucially, on the confirm sheet before a
  // counter reward is burnt — the point of no return.
  instructions: text("instructions").notNull().default(""),
  // Where an online code gets used. Rendered as a button, never pasted
  // into the instructions text.
  redeemUrl: text("redeem_url"),
  totalStock: integer("total_stock").notNull().default(25),
  remaining: integer("remaining").notNull().default(25),
  validDays: integer("valid_days").notNull().default(14),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * The listing-fee payment ledger. Named `bids` from when the amount was
 * negotiable; kept rather than renamed to avoid a destructive migration on a
 * live table. `amountPaise` is now always the flat fee (`LISTING_FEE_PAISE`
 * in lib/rules.ts) — every row is the same number — and a brand only ever
 * has one row reach status "paid", since a listed brand can't pay again.
 */
export const bids = pgTable("bids", {
  id: uuid("id").defaultRandom().primaryKey(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  amountPaise: integer("amount_paise").notNull(),
  status: text("status").notNull().default("created"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

/**
 * One customer's upvote for one brand — what now moves a brand up and down
 * the board, in place of paying more.
 *
 * The unique index is the whole mechanism: it's what makes "one vote per
 * brand" actually true rather than something the API merely promises. A
 * customer can hold as many rows here as there are brands they like; they
 * just can't hold two for the same brand.
 */
export const votes = pgTable(
  "votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    voterId: uuid("voter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("votes_voter_brand_idx").on(t.voterId, t.brandId)]
);

/**
 * A brand's own single-use discount codes, uploaded in a batch. One is
 * claimed per win and never reused, which is what makes an online reward
 * an actual reward rather than a coupon anyone can screenshot and share.
 *
 * Unassigned rows are the live stock for an online reward.
 */
export const couponCodes = pgTable(
  "coupon_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rewardId: uuid("reward_id")
      .notNull()
      .references(() => rewards.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    assignedGrantId: uuid("assigned_grant_id"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("coupon_codes_reward_code_idx").on(t.rewardId, t.code)]
);

// ---------------------------------------------------------------- play

/**
 * One round per customer per day *per mode*, enforced by the unique index
 * below. The mode is in the key so the three board experiments can be tried
 * side by side on the same day — otherwise testing one would lock out the
 * others and no comparison would be possible. Collapse this back to
 * (user_id, day_key) once a winner is chosen.
 */
export const plays = pgTable(
  "plays",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayKey: text("day_key").notNull(),
    mode: text("mode").notNull().default("classic"),
    landedPosition: integer("landed_position").notNull(),
    steps: integer("steps").notNull(),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
    grantId: uuid("grant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("plays_user_day_mode_idx").on(t.userId, t.dayKey, t.mode)]
);

/**
 * A won reward. Gifting hands ownership to someone else — the rule is that
 * once you've shared it you can't redeem it yourself, so `status` goes
 * active → gifted → (claimed back to active, owned by the friend) → redeemed.
 */
export const grants = pgTable("grants", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
  brandName: text("brand_name").notNull(),
  label: text("label").notNull(),
  icon: text("icon").notNull().default("🎁"),
  status: text("status").notNull().default("active"),
  // Snapshotted at the moment it's won, like expiresAt — a brand editing
  // their listing later must not change what someone already holds.
  redemptionType: text("redemption_type").notNull().default("counter"),
  instructions: text("instructions").notNull().default(""),
  redeemUrl: text("redeem_url"),
  // The brand's own code for an online reward. Null for counter rewards,
  // where our `code` above is the whole proof.
  couponCode: text("coupon_code"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  giftedToEmail: text("gifted_to_email"),
  giftedAt: timestamp("gifted_at", { withTimezone: true }),
  // Who it originally belonged to, kept so the sender still sees it listed
  // as given away rather than having it vanish from their wallet.
  giftedByUserId: uuid("gifted_by_user_id").references(() => users.id, { onDelete: "set null" }),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Per-day tile opens. `brands.clicks` stays as the lifetime total — this
 * table is what lets a brand see the shape of a day rather than one
 * ever-growing number.
 */
export const brandClicks = pgTable(
  "brand_clicks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    dayKey: text("day_key").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [uniqueIndex("brand_clicks_brand_day_idx").on(t.brandId, t.dayKey)]
);

/**
 * One row per visitor per day, keyed by a first-party cookie.
 *
 * Counting rows rather than requests is the difference between "people came
 * here" and "a page loaded", and the number is shown to the public — so it
 * has to be the first one. No IP, no fingerprint: a random id in a cookie
 * the visitor can clear.
 */
export const visits = pgTable(
  "visits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    visitorId: uuid("visitor_id").notNull(),
    dayKey: text("day_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("visits_visitor_day_idx").on(t.visitorId, t.dayKey)]
);

// ---------------------------------------------------------------- wishes

export const wishes = pgTable("wishes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  category: text("category").notNull(),
  dayKey: text("day_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
