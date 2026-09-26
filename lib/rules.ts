export const BOARD_SIZE = 50;
export const BID_BASE_PAISE = 50_000; // ₹500 — the floor to get on the board
export const BID_STEP_PAISE = 10_000; // ₹100 — the increment above it
export const WISHES_PER_DAY = 2;
export const DEFAULT_REWARD_VALID_DAYS = 14;
/** How long the code stays on screen at the counter after being redeemed. */
export const REDEEM_WINDOW_SECONDS = 30;

export const CATEGORIES = [
  "Food & Beverage",
  "Beauty & Wellness",
  "Fitness",
  "Shopping",
  "Entertainment",
  "Travel",
] as const;

export const CATEGORY_ICON: Record<string, string> = {
  "Food & Beverage": "☕",
  "Beauty & Wellness": "💆",
  Fitness: "🏋️",
  Shopping: "🛍️",
  Entertainment: "🎬",
  Travel: "✈️",
};

export const CATEGORY_ACCENT: Record<string, string> = {
  "Food & Beverage": "#b4560f",
  "Beauty & Wellness": "#b8306f",
  Fitness: "#0f8b6c",
  Shopping: "#2354a6",
  Entertainment: "#a6237e",
  Travel: "#1789a6",
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
