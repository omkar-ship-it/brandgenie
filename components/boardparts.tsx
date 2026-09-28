"use client";

import { useCallback, useRef, useState } from "react";
import type { BoardEntry } from "@/lib/board";
import { CATEGORY_ACCENT, rupees } from "@/lib/rules";

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

export type Prize = {
  code: string;
  label: string;
  icon: string;
  brandName: string;
  redemptionType?: string;
  couponCode?: string | null;
  expiresAt: string;
};

/**
 * Cell geometry, measured rather than assumed.
 *
 * The grid auto-fills, so the column count and cell size change with the
 * viewport, and the genie is positioned from them. A callback ref rather
 * than a mount effect because the board isn't in the DOM yet when a mount
 * effect runs.
 */
export function useBoardMetrics() {
  const [cellW, setCellW] = useState(0);
  const [cellH, setCellH] = useState(0);
  const [cols, setCols] = useState(10);
  const [gap, setGap] = useState(10);
  const observer = useRef<ResizeObserver | null>(null);

  const attachBoard = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!node) return;
    const ro = new ResizeObserver(() => {
      const tile = node.querySelector(".tile") as HTMLElement | null;
      if (!tile) return;
      const style = getComputedStyle(node);
      setCellW(tile.offsetWidth);
      setCellH(tile.offsetHeight);
      setCols(style.gridTemplateColumns.split(" ").length);
      setGap(parseFloat(style.gap) || 0);
    });
    ro.observe(node);
    observer.current = ro;
  }, []);

  /** Where the genie sits for a 1-based board position. */
  const cellStyle = (position: number) => ({
    left: ((position - 1) % cols) * (cellW + gap),
    top: Math.floor((position - 1) / cols) * (cellH + gap),
    width: cellW,
    height: cellH,
  });

  return { attachBoard, cellW, cellH, cols, gap, ready: cellW > 0, cellStyle };
}

/** One brand's square, identical across every board variant. */
export function BoardTile({
  entry,
  position,
  onOpen,
  hasGenie,
  outlineColor,
  selectable,
  selected,
}: {
  entry: BoardEntry;
  position: number;
  onOpen?: () => void;
  hasGenie?: boolean;
  outlineColor?: string;
  selectable?: boolean;
  selected?: boolean;
}) {
  const accent = CATEGORY_ACCENT[entry.category] ?? "var(--brand)";
  const h = hue(entry.brandId);
  const out = entry.remaining <= 0;

  return (
    <button
      className={`tile${hasGenie ? " has-genie" : ""}${selected ? " picked" : ""}`}
      onClick={onOpen}
      style={{ borderColor: outlineColor }}
      title={`#${position} · ${entry.name}`}
      aria-pressed={selectable ? Boolean(selected) : undefined}
    >
      <span className="tile-rank">#{position}</span>
      {selectable && <span className="tile-check">{selected ? "✓" : ""}</span>}
      <span
        className="tile-mark"
        style={
          entry.logoUrl
            ? undefined
            : { background: `linear-gradient(140deg, hsl(${h} 62% 46%), hsl(${(h + 34) % 360} 66% 32%))` }
        }
      >
        {entry.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.logoUrl} alt="" className="tile-logo" />
        ) : (
          initials(entry.name)
        )}
      </span>
      <span className="tile-name">{entry.name}</span>
      <span className="tile-reward">
        {entry.rewardLabel ? (
          <>
            {entry.rewardIcon} {entry.rewardLabel}
            {!out && <span className="text-ink-soft"> · {entry.remaining} left</span>}
          </>
        ) : (
          <span className="opacity-60">No reward listed</span>
        )}
      </span>
      {out && <span className="tile-out">SOLD OUT</span>}
      <span className="tile-stats">
        <span className="tile-bid" style={{ color: accent }}>
          {rupees(entry.bidPaise)}
        </span>
        <span className="tile-clicks">{compact(entry.clicks)} clicks</span>
      </span>
    </button>
  );
}

/** The empty lots beyond the last paid position. */
export function EmptyTile({ position }: { position: number }) {
  return (
    <div className="tile empty">
      <span className="tile-rank">{position}</span>
      <span className="text-[14px] text-ink-soft opacity-40">+</span>
    </div>
  );
}

/** What you won, shown the same way whichever board handed it over. */
export function PrizeCard({
  prize,
  landed,
  preview = false,
  signInHref,
}: {
  prize: Prize | null;
  landed: number;
  preview?: boolean;
  signInHref?: string;
}) {
  if (!prize) {
    return (
      <div className="card pop mb-5 p-5">
        <p className="text-[13.5px] text-ink-soft">
          He stopped at #{landed} but there was nothing left on the shelf. Try again tomorrow.
        </p>
      </div>
    );
  }
  return (
    <div className="card pop mb-5 flex flex-wrap items-center gap-4 p-5">
      <span className="text-[30px]">{prize.icon}</span>
      <div className="min-w-[200px] flex-1">
        <div className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">
          {preview ? "You would have won" : "You won"}
        </div>
        <div className="text-[17px] font-semibold">{prize.label}</div>
        <div className="text-[12.5px] text-ink-soft">
          {prize.brandName}
          {!preview && (
            <>
              {" "}
              · use by{" "}
              {new Date(prize.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </>
          )}
        </div>
      </div>
      {preview ? (
        <a href={signInHref ?? "/login"} className="btn btn-primary">
          Sign in to play for real
        </a>
      ) : (
        <>
          <span className="mono rounded-lg bg-sunk px-3 py-2 text-[14px] font-semibold">
            {prize.couponCode ?? prize.code}
          </span>
          <a href="/rewards" className="btn btn-ghost">
            My rewards
          </a>
        </>
      )}
    </div>
  );
}

/** Said once, above the board, so nobody thinks they're winning things. */
export function PreviewNotice({ signInHref }: { signInHref: string }) {
  return (
    <p className="previewbar mb-5">
      <span className="text-[17px]">👀</span>
      <span className="flex-1">
        You&rsquo;re trying this one out — play as many times as you like, but nothing is awarded and no
        brand&rsquo;s stock is used.
      </span>
      <a href={signInHref} className="font-semibold underline underline-offset-2">
        Sign in to play for real
      </a>
    </p>
  );
}
