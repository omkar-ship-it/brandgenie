"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BoardEntry } from "@/lib/board";
import { BOARD_SIZE } from "@/lib/rules";
import { BoardTile, EmptyTile, PrizeCard, useBoardMetrics, type Prize } from "./boardparts";

type Plan = { token: string; tickMs: number; maxMs: number; order: number[] };
type State =
  | { kind: "idle" }
  | { kind: "walking"; plan: Plan; startedAt: number }
  | { kind: "stopping" }
  | { kind: "done"; landed: number; prize: Prize | null };

/**
 * Experiment B — he walks the board tile by tile and the player stops him.
 *
 * The browser times the stop because it has to, but it only reports *when*;
 * the server owns the walk order and works out where that lands. Sold-out
 * tiles stay in the walk rather than being skipped: they're visibly marked,
 * and stopping on one is the player's own call, which is the whole point of
 * a mode built on timing.
 */
export function StopBoard({ board, signedIn, playedToday }: {
  board: BoardEntry[];
  signedIn: boolean;
  playedToday: boolean;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [token, setToken] = useState(board[0]?.position ?? 1);
  const [error, setError] = useState("");
  const { attachBoard, ready, cellStyle } = useBoardMetrics();
  const timer = useRef<number | null>(null);

  // A ref so the click handler reads the true start time rather than a
  // value closed over when the walk began.
  const startedAtRef = useRef(0);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

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
    setState({ kind: "done", landed: data.landed, prize: data.prize });
  }

  const spent = playedToday || state.kind === "done";
  const walking = state.kind === "walking";

  return (
    <>
      <div className="card mb-5 flex flex-wrap items-center gap-4 p-5">
        <span className="text-[34px] leading-none">{walking ? "🧞" : spent ? "🌙" : "⏱️"}</span>
        <div className="min-w-[240px] flex-1">
          <div className="text-[15px] font-semibold">
            Stop the genie
            {walking && <span className="mono ml-2 text-[12px] font-normal text-ink-soft">on #{token}</span>}
          </div>
          <p className="text-[13px] text-ink-soft">
            {spent
              ? "That's your round for today."
              : walking
                ? "Hit stop on the brand you want — he won't wait."
                : "He'll walk the board one brand at a time. Stop him where you want, but he moves quickly."}
          </p>
          {error && <p className="mt-1 text-[12px] font-semibold text-warn">{error}</p>}
        </div>

        {!signedIn ? (
          <Link href="/login?next=/try/stop" className="btn btn-primary">
            🎁 Play
          </Link>
        ) : walking ? (
          <button onClick={() => stop(state.plan)} className="btn btn-stop">
            ✋ STOP
          </button>
        ) : (
          <button onClick={start} disabled={spent || state.kind === "stopping" || board.length === 0} className="btn btn-primary">
            {state.kind === "stopping" ? "…" : spent ? "Come back tomorrow" : "🧞 Start him walking"}
          </button>
        )}
      </div>

      {state.kind === "done" && <PrizeCard prize={state.prize} landed={state.landed} />}

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
            />
          );
        })}

        {ready && state.kind !== "idle" && (
          <span className="genie" style={cellStyle(token)} aria-hidden="true">
            <span>🧞</span>
          </span>
        )}
      </div>
    </>
  );
}
