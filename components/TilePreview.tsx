"use client";

import { CATEGORY_ACCENT, rupees } from "@/lib/rules";

function initials(name: string) {
  const words = name.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  return (words.slice(0, 2).map((w) => w[0]).join("") || name.slice(0, 2) || "?").toUpperCase();
}

function hue(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

/**
 * The brand's own tile, drawn exactly as the board draws it.
 *
 * Deliberately a live mirror of the form rather than a saved snapshot — a
 * brand typing a name that clips, or picking a reward line that wraps to
 * three rows, finds out here instead of after they've paid for a position.
 */
export function TilePreview({
  name,
  category,
  rewardLabel,
  rewardIcon,
  logoUrl,
  remaining,
  bidPaise,
  position,
  clicks,
}: {
  name: string;
  category: string;
  rewardLabel: string;
  rewardIcon: string;
  logoUrl: string | null;
  remaining: number;
  bidPaise: number;
  position: number | null;
  clicks: number;
}) {
  const accent = CATEGORY_ACCENT[category] ?? "var(--brand)";
  const h = hue(name || "brand");
  const out = remaining <= 0;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label mb-0">How you look on the board</span>
        <span className="mono text-[11px] text-ink-soft">live preview</span>
      </div>

      <div className="preview-stage mt-3">
        <div className="tile" style={{ cursor: "default" }}>
          <span className="tile-rank">{position ? `#${position}` : "#—"}</span>
          <span
            className="tile-mark"
            style={
              logoUrl
                ? undefined
                : { background: `linear-gradient(140deg, hsl(${h} 62% 46%), hsl(${(h + 34) % 360} 66% 32%))` }
            }
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="tile-logo" />
            ) : (
              initials(name)
            )}
          </span>
          <span className="tile-name">{name || "Your brand"}</span>
          <span className="tile-reward">
            {rewardLabel ? (
              <>
                {rewardIcon} {rewardLabel}
                {!out && <span className="text-ink-soft"> · {remaining} left</span>}
              </>
            ) : (
              <span className="opacity-60">No reward listed</span>
            )}
          </span>
          {out && <span className="tile-out">SOLD OUT</span>}
          <span className="tile-stats">
            <span className="tile-bid" style={{ color: accent }}>
              {rupees(bidPaise)}
            </span>
            <span className="tile-clicks">{clicks} clicks</span>
          </span>
        </div>
      </div>

      <p className="mt-3 text-[11.5px] text-ink-soft">
        {position
          ? `Sitting at #${position} right now.`
          : "You'll appear on the board as soon as your first bid goes through."}
      </p>
    </div>
  );
}
