/**
 * The two pure helpers behind every tile mark on the site — the board, the
 * brand console preview, and now Brand Corner and Brand Drops. Kept in a
 * plain module rather than re-exported from components/boardparts.tsx: that
 * file is "use client", and a server component can't call a function from a
 * client module even when the function itself touches nothing client-side.
 */

/** 1 234 clicks reads as "1.2k" once a tile gets busy. */
export function compact(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

export function initials(name: string) {
  const words = name.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  return (words.slice(0, 2).map((w) => w[0]).join("") || name.slice(0, 2) || "?").toUpperCase();
}

export function hue(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}
