import { pgTable, text, timestamp, integer, uuid, uniqueIndex } from "drizzle-orm/pg-core";

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
 * One brand per account. `bidPaise` is the live bid that ranks the board —
 * it only ever moves after a payment is verified, never from the client.
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
  // How many people have opened this brand's card from the board. The
  // engagement number a brand is buying a position for.
  clicks: integer("clicks").notNull().default(0),
  // Breaks ties between equal bids — whoever got there first keeps the rank.
  bidAt: timestamp("bid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** What the brand gives away when the genie stops on them. */
export const rewards = pgTable("rewards", {
  id: uuid("id").defaultRandom().primaryKey(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  icon: text("icon").notNull().default("🎁"),
  totalStock: integer("total_stock").notNull().default(25),
  remaining: integer("remaining").notNull().default(25),
  validDays: integer("valid_days").notNull().default(14),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Payment ledger. A bid is only live once its row reaches status "paid". */
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

// ---------------------------------------------------------------- play

/** One round per customer per day, enforced by the unique index below. */
export const plays = pgTable(
  "plays",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayKey: text("day_key").notNull(),
    landedPosition: integer("landed_position").notNull(),
    steps: integer("steps").notNull(),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
    grantId: uuid("grant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("plays_user_day_idx").on(t.userId, t.dayKey)]
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
