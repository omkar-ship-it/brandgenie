/**
 * Content for Brand Corner and Brand Drops — both concept previews, not
 * features. Neither module has any game logic or real unlock behaviour
 * behind it; this file is the whole of what makes them look real enough to
 * be judged by a brand or a customer deciding whether they'd use them.
 *
 * Brands reuse names already vetted against real Indian companies
 * elsewhere in the codebase (scripts/seed.mjs) rather than inventing a
 * fresh set — the same rule applies here as everywhere else on this
 * project: no real company's name on a public page implying they're a
 * customer of ours.
 */

export type GameKind = "dice" | "wheel" | "timer" | "quiz" | "cards";

export const GAME_LABEL: Record<GameKind, string> = {
  dice: "Roll the Dice",
  wheel: "Spin the Wheel",
  timer: "Stop at Exactly 10s",
  quiz: "Quiz Time",
  cards: "Scratch & Win",
};

export type CornerBrand = {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  game: GameKind;
  reward: string;
};

export const CORNER_BRANDS: CornerBrand[] = [
  {
    slug: "sawari",
    name: "Sawari",
    category: "Travel",
    tagline: "Autos and cabs, fixed fares",
    game: "dice",
    reward: "₹50 off your next ride",
  },
  {
    slug: "haldi-house",
    name: "Haldi House",
    category: "D2C · Wellness & Skincare",
    tagline: "Daily skincare, honestly labelled",
    game: "timer",
    reward: "A free 3-step starter set",
  },
  {
    slug: "sur-stream",
    name: "Sur Stream",
    category: "Entertainment",
    tagline: "Music without the ad breaks",
    game: "quiz",
    reward: "One month free",
  },
  {
    slug: "taar-audio",
    name: "Taar Audio",
    category: "Electronics",
    tagline: "Earphones built to be repaired",
    game: "wheel",
    reward: "₹500 off a pair",
  },
  {
    slug: "bazaar-box",
    name: "Bazaar Box",
    category: "E-Commerce",
    tagline: "Everything, next-day",
    game: "cards",
    reward: "₹400 off anything",
  },
  {
    slug: "maison-ardour",
    name: "Maison Ardour",
    category: "Aspirational Brands",
    tagline: "Swiss movements, assembled in Bengaluru",
    game: "wheel",
    reward: "A free strap upgrade",
  },
];

export function findCornerBrand(slug: string) {
  return CORNER_BRANDS.find((b) => b.slug === slug);
}

export type DropKind = "reward" | "merch" | "mystery" | "game";

export const DROP_KIND_LABEL: Record<DropKind, string> = {
  reward: "Reward drop",
  merch: "Merchandise drop",
  mystery: "Mystery box",
  game: "Game drop",
};

export type Drop = {
  slug: string;
  name: string;
  category: string;
  kind: DropKind;
  title: string;
  description: string;
  /**
   * Hours until this preview "unlocks" — counted from whenever someone
   * loads the page, not from a fixed calendar moment. A real drop unlocks
   * for everyone at once; this one resets on every visit, because it's
   * demonstrating the mechanic, not running it. Said outright on the page
   * rather than left for someone to notice — a countdown that quietly
   * isn't real is the kind of thing that erodes trust the moment it's
   * spotted.
   */
  unlocksInHours: number;
};

export const DROPS: Drop[] = [
  {
    slug: "kirayewala-mystery",
    name: "Kirayewala",
    category: "E-Commerce",
    kind: "mystery",
    title: "???",
    description: "Nobody knows what's in this one until it opens. That's rather the point.",
    unlocksInHours: 26,
  },
  {
    slug: "sehat-store-reward",
    name: "Sehat Store",
    category: "D2C · Wellness & Skincare",
    kind: "reward",
    title: "Double rewards weekend",
    description: "Every win pays out twice, for 48 hours only.",
    unlocksInHours: 50,
  },
  {
    slug: "charpai-co-merch",
    name: "Charpai Co",
    category: "Lifestyle",
    kind: "merch",
    title: "A limited coaster set",
    description: "300 made. Once they're claimed on the day, that's all of them.",
    unlocksInHours: 5 * 24 + 6,
  },
  {
    slug: "khel-arcade-game",
    name: "Khel Arcade",
    category: "Entertainment",
    kind: "game",
    title: "A one-day arcade challenge",
    description: "A leaderboard that resets the moment it opens, and closes just as fast.",
    unlocksInHours: 8 * 24 + 3,
  },
];

export function findDrop(slug: string) {
  return DROPS.find((d) => d.slug === slug);
}
