"use client";

import { useEffect, useRef, useState } from "react";
import type { BoardEntry } from "@/lib/board";
import { visibleSlots } from "@/lib/rules";
import { BoardTile, BrandSheet, EmptyTile, GenieMark, PreviewNotice, PrizeCard, useBrandSheet } from "./boardparts";
import { IconMoon, IconPlay } from "./icons";

type Prize = { code: string; label: string; icon: string; brandName: string; expiresAt: string };
type PlayState =
  | { kind: "idle" }
  | { kind: "walking"; at: number }
  | { kind: "done"; landed: number; steps: number; prize: Prize | null; preview: boolean };

export function Board({
  board,
  signedIn,
  isMerchant,
  playedToday,
  startPosition,
  showcase = false,
  demo = false,
}: {
  board: BoardEntry[];
  signedIn: boolean;
  isMerchant: boolean;
  playedToday: boolean;
  startPosition: number;
  /** Let the bid buy area on the grid rather than just a rank number. */
  showcase?: boolean;
  /** Showcase board: resolves and animates, but awards nothing. */
  demo?: boolean;
}) {
  const [state, setState] = useState<PlayState>({ kind: "idle" });
  const [token, setToken] = useState(startPosition);
  const [hop, setHop] = useState(false);
  const [error, setError] = useState("");
  const { selected, openBrand, closeBrand } = useBrandSheet();
  const boardEl = useRef<HTMLDivElement | null>(null);
  const [genieBox, setGenieBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  /**
   * Measure the tile he's on rather than compute it. With the showcase grid
   * the cells aren't all the same size, so arithmetic from one cell width
   * lands him on the wrong brand.
   */
  useEffect(() => {
    const place = () => {
      const tile = boardEl.current?.querySelectorAll<HTMLElement>(".tile")[token - 1];
      setGenieBox(
        tile ? { left: tile.offsetLeft, top: tile.offsetTop, width: tile.offsetWidth, height: tile.offsetHeight } : null
      );
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [token, board.length]);

  const busy = state.kind === "walking";
  // Signed out, this board is a demo: it awards nothing, so it can be
  // replayed as often as someone likes.
  const anonymous = !signedIn;

  // Once the round has run in this tab, the server's `playedToday` is stale.
  const spent = !demo && signedIn && (playedToday || state.kind === "done");

  async function startRound() {
    if (busy || spent) return;
    setError("");
    setState({ kind: "walking", at: startPosition });

    const res = await fetch("/api/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "classic", demo }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState({ kind: "idle" });
      return setError(data.error ?? "Couldn't start the round.");
    }

    const claimed = board.length;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setToken(data.landed);
      setState({ kind: "done", landed: data.landed, steps: data.steps, prize: data.prize, preview: Boolean(data.preview) });
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
      setState({ kind: "done", landed: data.landed, steps: data.steps, prize: data.prize, preview: Boolean(data.preview) });
    }, elapsed + 380);
  }


  return (
    <>
      {/* --------------------------------- the round */}
      <div className="card mb-5 flex flex-wrap items-center gap-4 p-5">
        <span className="roundmark">
          {isMerchant || busy ? (
            <GenieMark />
          ) : spent ? (
            <IconMoon size={22} />
          ) : (
            <GenieMark />
          )}
        </span>

        {/* A floor width so the button drops to its own line rather than
            squeezing the copy into a column on a phone. */}
        <div className="min-w-[220px] flex-1">
          <div className="text-[15px] font-semibold">
            The Genie&rsquo;s Round
            {busy && <span className="mono ml-2 text-[12px] font-normal text-ink-soft">walking… #{token}</span>}
          </div>
          <p className="text-[13px] text-ink-soft">
            {isMerchant ? (
              <>
                He sets off from <span className="mono font-semibold">#{startPosition}</span> today and stops on
                one brand per customer. The round is for customers, so there&rsquo;s nothing for you to tap.
              </>
            ) : state.kind === "done" ? (
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

        {isMerchant ? null : (
          <button onClick={startRound} disabled={busy || spent || board.length === 0} className="btn btn-primary">
            {busy ? (
              "He’s off…"
            ) : spent ? (
              "Come back tomorrow"
            ) : (
              <>
                <IconPlay /> Wake the genie
              </>
            )}
          </button>
        )}
      </div>

      {anonymous && <PreviewNotice signInHref="/login?next=/try/walk" />}

      {state.kind === "done" && (
        <PrizeCard
          prize={state.prize}
          landed={state.landed}
          preview={state.preview}
          signInHref="/login?next=/try/walk"
        />
      )}

      {/* --------------------------------- board */}
      <div
        className={`board${showcase ? " showcase" : ""}`}
        ref={boardEl}
      >
        {Array.from({ length: visibleSlots(board.length) }, (_, i) => {
          const position = i + 1;
          const entry = board[i];
          if (!entry) return <EmptyTile key={position} position={position} />;
          return (
            <BoardTile
              key={position}
              entry={entry}
              position={position}
              hasGenie={token === position}
              outlineColor={state.kind === "done" && state.landed === position ? "var(--good)" : undefined}
              onOpen={busy ? undefined : () => openBrand(entry)}
              span={showcase ? (position === 1 ? "xl" : position <= 3 ? "wide" : undefined) : undefined}
            />
          );
        })}

        {genieBox && (
          <span
            className={`genie ${hop ? "hop" : ""}`}
            style={genieBox}
            aria-hidden="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/genie.png" alt="" className="genie-img" />
          </span>
        )}
      </div>

      {selected && <BrandSheet entry={selected} onClose={closeBrand} />}
    </>
  );
}
