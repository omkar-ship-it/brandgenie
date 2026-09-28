"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BoardEntry } from "@/lib/board";
import { BOARD_SIZE } from "@/lib/rules";
import {
  BoardTile,
  BrandSheet,
  EmptyTile,
  PreviewNotice,
  PrizeCard,
  useBoardMetrics,
  useBrandSheet,
  type Prize,
} from "./boardparts";
import { IconClock, IconMoon, IconPlay, IconStop, IconSteps } from "./icons";

type Plan = { token: string; tickMs: number; maxMs: number; order: number[] };
type State =
  | { kind: "idle" }
  | { kind: "walking"; plan: Plan; startedAt: number }
  | { kind: "stopping" }
  | { kind: "done"; landed: number; prize: Prize | null; preview: boolean };

/**
 * Experiment B — he walks the board tile by tile and the player stops him.
 *
 * The browser times the stop because it has to, but it only reports *when*;
 * the server owns the walk order and works out where that lands. Sold-out
 * tiles stay in the walk rather than being skipped: they're visibly marked,
 * and stopping on one is the player's own call, which is the whole point of
 * a mode built on timing.
 */
export function StopBoard({
  board,
  signedIn,
  playedToday,
  isMerchant = false,
  backTo = "/try/stop",
  allowAnonymous = true,
}: {
  board: BoardEntry[];
  signedIn: boolean;
  playedToday: boolean;
  isMerchant?: boolean;
  backTo?: string;
  /** The real board asks for an account; the try boards don't. */
  allowAnonymous?: boolean;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [token, setToken] = useState(board[0]?.position ?? 1);
  const [error, setError] = useState("");
  const { attachBoard, boardRef, ready, cellStyle } = useBoardMetrics();
  const { selected, openBrand, closeBrand } = useBrandSheet();
  const timer = useRef<number | null>(null);

  // A ref so the click handler reads the true start time rather than a
  // value closed over when the walk began.
  const startedAtRef = useRef(0);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  /**
   * Keep whichever tile he's on inside the viewport.
   *
   * The board is fifty tiles tall, so he walks below the fold within a few
   * seconds — and a timing game where you can't see where he is isn't a
   * game. `block: "nearest"` only scrolls when he'd otherwise leave, and it
   * scrolls instantly rather than smoothly on purpose: smooth scrolling
   * lags behind a 260ms step, so the tile under your thumb would no longer
   * be the tile he's on.
   */
  useEffect(() => {
    if (state.kind !== "walking") return;
    const tile = boardRef.current?.querySelectorAll(".tile")[token - 1];
    tile?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [token, state.kind, boardRef]);

  // Space or Enter stops him too — by the time he's near the bottom of a
  // long board, reaching for a key beats reaching for a button.
  useEffect(() => {
    if (state.kind !== "walking") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      void stop(state.plan);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  async function start() {
    setError("");
    const res = await fetch("/api/play/walk");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error ?? "Couldn't start the round.");

    const plan: Plan = { token: data.token, tickMs: data.tickMs, maxMs: data.maxMs, order: data.order };
    const startedAt = Date.now();
    startedAtRef.current = startedAt;
    setState({ kind: "walking", plan, startedAt });
    setToken(plan.order[0]);

    timer.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed >= plan.maxMs) {
        // He gives up rather than walking forever — and that still costs the
        // round, same as any other stop.
        void stop(plan, plan.maxMs - 1);
        return;
      }
      setToken(plan.order[Math.floor(elapsed / plan.tickMs) % plan.order.length]);
    }, 40);
  }

  async function stop(plan: Plan, forcedElapsed?: number) {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    const elapsedMs = forcedElapsed ?? Date.now() - startedAtRef.current;
    setState({ kind: "stopping" });

    const res = await fetch("/api/play/walk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: plan.token, elapsedMs }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState({ kind: "idle" });
      return setError(data.error ?? "Couldn't stop him.");
    }
    setToken(data.landed);
    setState({ kind: "done", landed: data.landed, prize: data.prize, preview: Boolean(data.preview) });
  }

  // On a gated board (the real one) a signed-out visitor can look but not
  // play. Where anonymous play is allowed, a round awards nothing, so it can
  // be replayed as often as someone likes.
  const spent = signedIn && (playedToday || state.kind === "done");
  const walking = state.kind === "walking";
  // Named on the dock so you can see who you're about to stop on without
  // hunting for the highlighted tile.
  const onTile = board.find((e) => e.position === token);
  const requiresSignIn = !signedIn && !allowAnonymous;

  return (
    <>
      <div className="card mb-5 flex flex-wrap items-center gap-4 p-5">
        <span className="roundmark">
          {isMerchant || walking ? <span className="text-[26px] leading-none">🧞</span>
            : spent ? <IconMoon size={22} /> : <IconClock size={22} />}
        </span>
        <div className="min-w-[240px] flex-1">
          <div className="text-[15px] font-semibold">
            Stop the genie
            {walking && <span className="mono ml-2 text-[12px] font-normal text-ink-soft">on #{token}</span>}
          </div>
          <p className="text-[13px] text-ink-soft">
            {requiresSignIn
              ? "Sign in and he'll walk the board for you — stop him on the brand you want and their reward is yours."
              : isMerchant
              ? "Customers stop him wherever they like — the higher your position, the sooner he reaches you. The round isn't yours to take."
              : spent
              ? "That's your round for today."
              : walking
                ? "Hit stop on the brand you want — he won't wait."
                : "He'll walk the board one brand at a time. Stop him where you want, but he moves quickly."}
          </p>
          {error && <p className="mt-1 text-[12px] font-semibold text-warn">{error}</p>}
        </div>

        {isMerchant ? null : requiresSignIn ? (
          <Link href={`/login?next=${backTo}`} className="btn btn-primary">
            <IconPlay /> Sign in to play
          </Link>
        ) : walking ? (
          <span className="mono text-[12px] text-ink-soft">stop him below ↓</span>
        ) : (
          <button onClick={start} disabled={spent || state.kind === "stopping" || board.length === 0} className="btn btn-primary">
            {state.kind === "stopping" ? (
              "…"
            ) : spent ? (
              "Come back tomorrow"
            ) : (
              <>
                <IconSteps /> Start him walking
              </>
            )}
          </button>
        )}
      </div>

      {/* Fixed to the viewport rather than the page: he walks below the fold
          within seconds on a fifty-tile board, and a stop button you have to
          scroll back up to find is no stop button at all. */}
      {walking && (
        <div className="stop-dock">
          <button onClick={() => stop(state.plan)} className="btn btn-stop" autoFocus>
            <IconStop size={17} /> STOP
          </button>
          <span className="stop-dock-hint">
            on <strong>#{token}</strong>
            {onTile ? ` · ${onTile.name}` : ""}
            <span className="press-hint"> — or press space</span>
          </span>
        </div>
      )}

      {!signedIn && !isMerchant && allowAnonymous && <PreviewNotice signInHref={`/login?next=${backTo}`} />}

      {state.kind === "done" && (
        <PrizeCard
          prize={state.prize}
          landed={state.landed}
          preview={state.preview}
          signInHref={`/login?next=${backTo}`}
        />
      )}

      <div className="board" ref={attachBoard}>
        {Array.from({ length: BOARD_SIZE }, (_, i) => {
          const position = i + 1;
          const entry = board[i];
          if (!entry) return <EmptyTile key={position} position={position} />;
          return (
            <BoardTile
              key={position}
              entry={entry}
              position={position}
              hasGenie={ready && token === position && state.kind !== "idle"}
              outlineColor={state.kind === "done" && state.landed === position ? "var(--good)" : undefined}
              // Tapping a tile mid-walk would open a card over the board
              // just as you need to see it, so it only opens when he's still.
              onOpen={walking ? undefined : () => openBrand(entry)}
            />
          );
        })}

        {ready && state.kind !== "idle" && (
          <span className="genie" style={cellStyle(token)} aria-hidden="true">
            <span>🧞</span>
          </span>
        )}
      </div>

      {selected && <BrandSheet entry={selected} onClose={closeBrand} />}
    </>
  );
}
