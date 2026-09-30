export const BOARD_SIZE = 50;

/**
 * How many squares to actually draw.
 *
 * All fifty from day one means a board that is 98% dashed outlines, which
 * reads as unfinished rather than as room to grow. Show what's taken plus a
 * handful of open places, and let the board fill out as brands join.
 */
export function visibleSlots(claimed: number) {
  return Math.min(BOARD_SIZE, Math.max(claimed + 9, 10));
}
/**
 * The one-time fee to be listed on the board — flat, non-negotiable, and the
 * same for every brand. Paying it makes a brand eligible; it no longer buys
 * position. Position is earned afterwards, in customer votes.
 */
export const LISTING_FEE_PAISE = 111_100; // ₹1,111
export const WISHES_PER_DAY = 2;
/** How many brands a player may shortlist in the "pick" experiment. */
export const PICK_LIMIT = 5;
export const DEFAULT_REWARD_VALID_DAYS = 14;
/** How long the code stays on screen at the counter after being redeemed. */
export const REDEEM_WINDOW_SECONDS = 30;

/**
 * The shelves a brand can sit on.
 *
 * These are the categories a *brand* recognises itself in, not a shopper's
 * browse tree — which is why "Aspirational" sits beside "Electronics" even
 * though one is a tier and the other a vertical. A brand buying a board
 * position is buying an audience, and those two buy differently.
 *
 * Changing this list is a migration, not an edit: `brands.category` and
 * `wishes.category` hold these strings, and both the brand console and the
 * wish form reject anything not in here. `scripts/recategorise.mjs` moves
 * existing rows across.
 */
export const CATEGORIES = [
  "Lifestyle",
  "D2C · Wellness & Skincare",
  "Entertainment",
  "Experiences",
  "Travel",
  "Electronics",
  "E-Commerce",
  "Aspirational Brands",
] as const;

export const CATEGORY_ICON: Record<string, string> = {
  Lifestyle: "🪴",
  "D2C · Wellness & Skincare": "✨",
  Entertainment: "🎬",
  Experiences: "🎟️",
  Travel: "✈️",
  Electronics: "🎧",
  "E-Commerce": "📦",
  "Aspirational Brands": "💎",
};

/**
 * One hue per shelf, used for the tile rule and the reward card. Kept at a
 * similar weight so no category looks louder than another on the board —
 * position is earned in customer votes, and colour shouldn't quietly outrank it.
 */
export const CATEGORY_ACCENT: Record<string, string> = {
  Lifestyle: "#0f8b6c",
  "D2C · Wellness & Skincare": "#b8306f",
  Entertainment: "#a6237e",
  Experiences: "#b4560f",
  Travel: "#1789a6",
  Electronics: "#4a4fbf",
  "E-Commerce": "#2354a6",
  "Aspirational Brands": "#8a6a10",
};

export const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

// ------------------------------------------------------------ time
// Everything time-based is anchored to IST so the daily round and the 11:11
// wish window mean the same thing for every player, wherever they are.

const IST_OFFSET_MINUTES = 330;

function istParts(now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return {
    dayKey: ist.toISOString().slice(0, 10),
    hours: ist.getUTCHours(),
    minutes: ist.getUTCMinutes(),
    seconds: ist.getUTCSeconds(),
  };
}

export function dayKey(now = new Date()) {
  return istParts(now).dayKey;
}

/** Lives here rather than inline so the clock read stays out of render. */
export function isExpired(at: Date | string) {
  return new Date(at).getTime() < Date.now();
}

/** The wish window is the 11:11 minute itself — 11:11am and 11:11pm IST. */
export function isWishWindowOpen(now = new Date()) {
  const { hours, minutes } = istParts(now);
  return minutes === 11 && (hours === 11 || hours === 23);
}

/** Milliseconds until the next 11:11 opens (0 while one is open). */
export function msUntilWishWindow(now = new Date()) {
  if (isWishWindowOpen(now)) return 0;
  const { hours, minutes, seconds } = istParts(now);
  const nowMin = hours * 60 + minutes;
  const targets = [11 * 60 + 11, 23 * 60 + 11];
  let deltaMin = targets.map((t) => (t - nowMin + 1440) % 1440).reduce((a, b) => Math.min(a, b));
  if (deltaMin === 0) deltaMin = 1440;
  return deltaMin * 60_000 - seconds * 1000;
}

/**
 * Where the genie falls asleep — the same position for everyone on a given
 * day, so the round is a shared ritual rather than a private roll.
 */
export function genieStart(key: string, claimed: number) {
  if (claimed < 1) return 1;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 9973;
  return (h % claimed) + 1;
}

export const WALK_MIN_STEPS = 9;
export const WALK_MAX_STEPS = 22;
