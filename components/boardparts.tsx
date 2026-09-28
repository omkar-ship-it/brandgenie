"use client";

import { useCallback, useRef, useState } from "react";
import type { BoardEntry } from "@/lib/board";
import { CATEGORY_ACCENT, CATEGORY_ICON, rupees } from "@/lib/rules";
import { IconCart, IconCounter, IconEye } from "./icons";

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
  const boardRef = useRef<HTMLDivElement | null>(null);

  const attachBoard = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    boardRef.current = node;
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

  /**
   * The same thing, measured off the DOM.
   *
   * Arithmetic works only while every cell is the same size. A grid where
   * the top bids take bigger tiles breaks that, so the genie's box is read
   * from the tile he's actually on. Re-measured whenever the tile or the
   * layout changes.
   */
  function measuredStyle(position: number) {
    const tile = boardRef.current?.querySelectorAll<HTMLElement>(".tile")[position - 1];
    if (!tile) return null;
    return { left: tile.offsetLeft, top: tile.offsetTop, width: tile.offsetWidth, height: tile.offsetHeight };
  }

  return { attachBoard, boardRef, cellW, cellH, cols, gap, ready: cellW > 0, cellStyle, measuredStyle };
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
  onInspect,
  span,
}: {
  entry: BoardEntry;
  position: number;
  onOpen?: () => void;
  hasGenie?: boolean;
  outlineColor?: string;
  selectable?: boolean;
  selected?: boolean;
  /** Where tapping the tile does something else, this opens the card. */
  onInspect?: () => void;
  /** How much of the showcase grid this brand's bid has earned it. */
  span?: "xl" | "wide";
}) {
  const accent = CATEGORY_ACCENT[entry.category] ?? "var(--brand)";
  const h = hue(entry.brandId);
  const out = entry.remaining <= 0;

  return (
    <button
      className={`tile${hasGenie ? " has-genie" : ""}${selected ? " picked" : ""}${span ? ` span-${span}` : ""}`}
      onClick={onOpen}
      style={{ borderColor: outlineColor, ["--accent" as string]: accent }}
      title={`#${position} · ${entry.name}`}
      aria-pressed={selectable ? Boolean(selected) : undefined}
    >
      <span className="tile-rank">#{position}</span>
      {selectable && <span className="tile-check">{selected ? "✓" : ""}</span>}
      {onInspect && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`About ${entry.name}`}
          className="tile-info"
          onClick={(e) => {
            e.stopPropagation();
            onInspect();
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            e.stopPropagation();
            onInspect();
          }}
        >
          i
        </span>
      )}
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
      {span && entry.tagline && <span className="tile-tagline">{entry.tagline}</span>}
      {span === "xl" && (
        <span className="tile-cat">
          {CATEGORY_ICON[entry.category]} {entry.category}
          {entry.area ? ` · ${entry.area}` : ""}
        </span>
      )}
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
      <IconEye size={17} />
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


/**
 * Opening a brand's card, plus the click it counts.
 *
 * Lives here rather than in one board because every board needs it: the
 * card is how a customer decides, and the count is the number a brand is
 * buying a position for. When the main board switched to the stop mechanic
 * this was left behind, and tile opens silently stopped being recorded —
 * keeping the two together is what stops that happening again.
 */
export function useBrandSheet() {
  const [selected, setSelected] = useState<BoardEntry | null>(null);

  const openBrand = (entry: BoardEntry) => {
    setSelected(entry);
    // Fire-and-forget: a failed count must never block the card opening.
    void fetch("/api/brands/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId: entry.brandId }),
    }).catch(() => {});
  };

  return { selected, openBrand, closeBrand: () => setSelected(null) };
}

/** The card behind a tile: who they are, what they're giving, where to find them. */
export function BrandSheet({ entry, onClose }: { entry: BoardEntry; onClose: () => void }) {
  const accent = CATEGORY_ACCENT[entry.category] ?? "var(--brand)";
  const online = entry.redemptionType === "online";

  return (
    <div
      className="backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={entry.name}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="sheet p-6">
        <div className="h-1.5 -mx-6 -mt-6 mb-5 rounded-t-[18px]" style={{ background: accent }} />
        <div className="mono text-[11px] text-ink-soft">
          Position #{entry.position} · bid {rupees(entry.bidPaise)} · {compact(entry.clicks)} clicks
        </div>
        <div className="mt-1 flex items-center gap-3">
          {entry.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.logoUrl} alt="" className="sheet-logo" />
          )}
          <h2 className="text-[21px] font-semibold">{entry.name}</h2>
        </div>
        {entry.tagline && <p className="mt-1 text-[13.5px] text-ink-soft">{entry.tagline}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px]">
          <span className="pill text-white" style={{ background: accent }}>
            {CATEGORY_ICON[entry.category]} {entry.category}
          </span>
          {entry.area && <span className="text-ink-soft">{entry.area}</span>}
        </div>

        {entry.rewardLabel && (
          <div className="mt-5 rounded-xl bg-sunk p-4">
            <div className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">Giving away</div>
            <div className="mt-1 text-[15px] font-semibold">
              {entry.rewardIcon} {entry.rewardLabel}
            </div>
            <div className="mono mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                {online ? <IconCart size={12} /> : <IconCounter size={12} />}
                {online ? "used online" : "at the counter"}
              </span>
              <span>·</span>
              <span>{entry.remaining > 0 ? `${entry.remaining} left` : "none left today"}</span>
              <span>·</span>
              <span>valid {entry.validDays} days</span>
            </div>
            {entry.instructions && (
              <p className="mt-2 text-[12px] text-ink-soft">{entry.instructions}</p>
            )}
          </div>
        )}

        {(entry.website || entry.instagram) && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {entry.website && (
              <a href={entry.website} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Website ↗
              </a>
            )}
            {entry.instagram && (
              <a href={entry.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Instagram ↗
              </a>
            )}
          </div>
        )}

        <button onClick={onClose} className="btn btn-primary mt-5 w-full" autoFocus>
          Close
        </button>
      </div>
    </div>
  );
}


/** The mascot at the size the round card shows him. */
export function GenieMark() {
  // A plain img: this is a fixed-size static asset already exported at the
  // right dimensions, so next/image would add a loader round-trip for it.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/genie.png" alt="" className="h-[30px] w-auto" />;
}
