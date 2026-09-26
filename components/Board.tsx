"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import type { BoardEntry } from "@/lib/board";
import { BOARD_SIZE, CATEGORY_ACCENT, CATEGORY_ICON, rupees } from "@/lib/rules";

/** 1 234 clicks reads as "1.2k" once a tile gets busy. */
function compact(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

const GAP = 10;

function initials(name: string) {
  const words = name.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  return (words.slice(0, 2).map((w) => w[0]).join("") || name.slice(0, 2)).toUpperCase();
}

function hue(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

type Prize = { code: string; label: string; icon: string; brandName: string; expiresAt: string };
type PlayState =
  | { kind: "idle" }
  | { kind: "walking"; at: number }
  | { kind: "done"; landed: number; steps: number; prize: Prize | null };

export function Board({
  board,
  signedIn,
  playedToday,
  startPosition,
}: {
  board: BoardEntry[];
  signedIn: boolean;
  playedToday: boolean;
  startPosition: number;
}) {
  const [selected, setSelected] = useState<BoardEntry | null>(null);
  const [state, setState] = useState<PlayState>({ kind: "idle" });
  const [token, setToken] = useState(startPosition);
  const [hop, setHop] = useState(false);
  const [error, setError] = useState("");
  const [cellSize, setCellSize] = useState(0);
  const [cellH, setCellH] = useState(0);
  const [cols, setCols] = useState(10);
  const [gap, setGap] = useState(GAP);
  const observer = useRef<ResizeObserver | null>(null);

  // The board reflows to 5 columns on narrow screens, so both the cell size
  // and the column count have to be measured rather than assumed.
  const attachBoard = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!node) return;
    const ro = new ResizeObserver(() => {
      const tile = node.querySelector(".tile") as HTMLElement | null;
      if (!tile) return;
      const style = getComputedStyle(node);
      setCellSize(tile.offsetWidth);
      setCellH(tile.offsetHeight);
      setCols(style.gridTemplateColumns.split(" ").length);
      setGap(parseFloat(style.gap) || 0);
    });
    ro.observe(node);
    observer.current = ro;
  }, []);

  const busy = state.kind === "walking";

  function openBrand(entry: BoardEntry) {
    setSelected(entry);
    // Fire-and-forget: a failed count must never block the card opening.
    void fetch("/api/brands/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId: entry.brandId }),
    }).catch(() => {});
  }
  // Once the round has run in this tab, the server's `playedToday` is stale.
  const spent = playedToday || state.kind === "done";

  async function startRound() {
    if (busy || playedToday) return;
    setError("");
    setState({ kind: "walking", at: startPosition });

    const res = await fetch("/api/play", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState({ kind: "idle" });
      return setError(data.error ?? "Couldn't start the round.");
    }

    const claimed = board.length;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setToken(data.landed);
      setState({ kind: "done", landed: data.landed, steps: data.steps, prize: data.prize });
      return;
    }

    // He sets off briskly and drags his feet over the last few steps.
    let elapsed = 0;
    for (let i = 1; i <= data.steps; i++) {
      const left = data.steps - i;
      const pace = left > 4 ? 130 : [500, 380, 290, 210, 165][left];
      elapsed += pace;
      const at = ((data.start - 1 + i) % claimed) + 1;
      window.setTimeout(() => {
        setToken(at);
        setHop(true);
        window.setTimeout(() => setHop(false), Math.min(170, pace - 20));
      }, elapsed);
    }
    window.setTimeout(() => {
      setState({ kind: "done", landed: data.landed, steps: data.steps, prize: data.prize });
    }, elapsed + 380);
  }

  const row = Math.floor((token - 1) / cols);
  const col = (token - 1) % cols;

  return (
    <>
      {/* --------------------------------- the round */}
      <div className="card mb-5 flex flex-wrap items-center gap-4 p-5">
        <span className="text-[34px] leading-none">{busy ? "🧞" : playedToday || state.kind === "done" ? "🌙" : "😴"}</span>

        {/* A floor width so the button drops to its own line rather than
            squeezing the copy into a column on a phone. */}
        <div className="min-w-[220px] flex-1">
          <div className="text-[15px] font-semibold">
            The Genie&rsquo;s Round
            {busy && <span className="mono ml-2 text-[12px] font-normal text-ink-soft">walking… #{token}</span>}
          </div>
          <p className="text-[13px] text-ink-soft">
            {state.kind === "done" ? (
              <>
                He walked {state.steps} places and stopped at{" "}
                <span className="mono font-semibold">#{state.landed}</span>.
              </>
            ) : playedToday ? (
              "That's your round for today — he sleeps again until midnight."
            ) : (
              <>
                He&rsquo;s asleep on <span className="mono font-semibold">#{startPosition}</span>, the same place for
                everyone today. Wake him and he walks until his feet give out.
              </>
            )}
          </p>
          {error && <p className="mt-1 text-[12px] font-semibold text-warn">{error}</p>}
        </div>

        {signedIn ? (
          <button onClick={startRound} disabled={busy || spent || board.length === 0} className="btn btn-primary">
            {busy ? "He’s off…" : spent ? "Come back tomorrow" : "🧞 Wake the genie"}
          </button>
        ) : (
          <Link href="/login?next=/" className="btn btn-primary">
            🎁 Play
          </Link>
        )}
      </div>

      {/* --------------------------------- prize */}
      {state.kind === "done" && (
        <div className="card pop mb-5 flex flex-wrap items-center gap-4 p-5">
          {state.prize ? (
            <>
              <span className="text-[30px]">{state.prize.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">You won</div>
                <div className="text-[17px] font-semibold">{state.prize.label}</div>
                <div className="text-[12.5px] text-ink-soft">
                  {state.prize.brandName} · use by{" "}
                  {new Date(state.prize.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </div>
              </div>
              <span className="mono rounded-lg bg-sunk px-3 py-2 text-[14px] font-semibold">{state.prize.code}</span>
              <Link href="/rewards" className="btn btn-ghost">
                My rewards
              </Link>
            </>
          ) : (
            <p className="text-[13.5px] text-ink-soft">
              He reached #{state.landed} but there was nothing left on the shelf. Try again tomorrow.
            </p>
          )}
        </div>
      )}

      {/* --------------------------------- board */}
      <div className="board" ref={attachBoard}>
        {Array.from({ length: BOARD_SIZE }, (_, i) => {
          const position = i + 1;
          const entry = board[i];
          if (!entry) {
            return (
              <div key={position} className="tile empty">
                <span className="tile-rank">{position}</span>
                <span className="text-[14px] text-ink-soft opacity-40">+</span>
              </div>
            );
          }
          const accent = CATEGORY_ACCENT[entry.category] ?? "var(--brand)";
          const h = hue(entry.brandId);
          const out = entry.remaining <= 0;
          return (
            <button
              key={position}
              className={`tile${token === position ? " has-genie" : ""}`}
              onClick={() => openBrand(entry)}
              style={{ borderColor: state.kind === "done" && state.landed === position ? "var(--good)" : undefined }}
              title={`#${position} · ${entry.name}`}
            >
              <span className="tile-rank">#{position}</span>
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
        })}

        {cellSize > 0 && (
          <span
            className={`genie ${hop ? "hop" : ""}`}
            style={{
              left: col * (cellSize + gap),
              top: row * (cellH + gap),
              width: cellSize,
              height: cellH,
            }}
            aria-hidden="true"
          >
            <span>🧞</span>
          </span>
        )}
      </div>

      {/* --------------------------------- brand sheet */}
      {selected && (
        <div
          className="backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={selected.name}
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div className="sheet p-6">
            <div className="h-1.5 -mx-6 -mt-6 mb-5 rounded-t-[18px]" style={{ background: CATEGORY_ACCENT[selected.category] }} />
            <div className="mono text-[11px] text-ink-soft">
              Position #{selected.position} · bid {rupees(selected.bidPaise)} · {compact(selected.clicks)} clicks
            </div>
            <div className="mt-1 flex items-center gap-3">
              {selected.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.logoUrl} alt="" className="sheet-logo" />
              )}
              <h2 className="text-[21px] font-semibold">{selected.name}</h2>
            </div>
            {selected.tagline && <p className="mt-1 text-[13.5px] text-ink-soft">{selected.tagline}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px]">
              <span className="pill text-white" style={{ background: CATEGORY_ACCENT[selected.category] }}>
                {CATEGORY_ICON[selected.category]} {selected.category}
              </span>
              {selected.area && <span className="text-ink-soft">{selected.area}</span>}
            </div>

            {selected.rewardLabel && (
              <div className="mt-5 rounded-xl bg-sunk p-4">
                <div className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">Giving away</div>
                <div className="mt-1 text-[15px] font-semibold">
                  {selected.rewardIcon} {selected.rewardLabel}
                </div>
                <div className="mono mt-1 text-[11.5px] text-ink-soft">
                  {selected.remaining} left · valid {selected.validDays} days after you win
                </div>
              </div>
            )}

            {(selected.website || selected.instagram) && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {selected.website && (
                  <a href={selected.website} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                    🌐 Website
                  </a>
                )}
                {selected.instagram && (
                  <a href={selected.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                    📸 Instagram
                  </a>
                )}
              </div>
            )}

            <button onClick={() => setSelected(null)} className="btn btn-primary mt-5 w-full">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
