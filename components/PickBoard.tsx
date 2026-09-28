"use client";

import { useState } from "react";
import type { BoardEntry } from "@/lib/board";
import { PICK_LIMIT, visibleSlots } from "@/lib/rules";
import {
  BoardTile,
  BrandSheet,
  EmptyTile,
  PreviewNotice,
  PrizeCard,
  useBoardMetrics,
  GenieMark,
  useBrandSheet,
  type Prize,
} from "./boardparts";
import { IconHandPick, IconMoon, IconSparkle } from "./icons";

type State =
  | { kind: "choosing" }
  | { kind: "walking" }
  | { kind: "done"; landed: number; prize: Prize | null; preview: boolean };

/**
 * Experiment A — the player shortlists the brands they'd actually want, and
 * the genie only walks among those.
 *
 * The draw stays random inside the shortlist rather than letting someone
 * name a single winner: picking one brand would make this "choose your
 * prize", which is a different product with no game in it.
 */
export function PickBoard({ board, signedIn, playedToday }: {
  board: BoardEntry[];
  signedIn: boolean;
  playedToday: boolean;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [state, setState] = useState<State>({ kind: "choosing" });
  const [token, setToken] = useState(1);
  const [error, setError] = useState("");
  const { attachBoard, ready, cellStyle } = useBoardMetrics();
  const { selected, openBrand, closeBrand } = useBrandSheet();

  // Signed out, this board is a demo: it can be replayed freely because it
  // awards nothing.
  const spent = signedIn && (playedToday || state.kind === "done");
  const stocked = (e: BoardEntry) => e.remaining > 0 && e.rewardLabel;

  function toggle(entry: BoardEntry) {
    if (spent || state.kind === "walking") return;
    setError("");
    setChosen((prev) =>
      prev.includes(entry.brandId)
        ? prev.filter((id) => id !== entry.brandId)
        : prev.length >= PICK_LIMIT
          ? prev
          : [...prev, entry.brandId]
    );
  }

  async function send() {
    if (chosen.length === 0 || spent) return;
    setError("");
    setState({ kind: "walking" });

    const res = await fetch("/api/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "pick", brandIds: chosen }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState({ kind: "choosing" });
      return setError(data.error ?? "Couldn't start the round.");
    }

    // He hops around the shortlist a few times before settling, so the
    // choice still feels drawn rather than announced.
    const shortlist: number[] = data.shortlist ?? [data.landed];
    const hops = shortlist.length > 1 ? 7 : 2;
    let t = 0;
    for (let i = 0; i < hops; i++) {
      t += 180;
      const at = shortlist[i % shortlist.length];
      window.setTimeout(() => setToken(at), t);
    }
    window.setTimeout(() => setToken(data.landed), t + 320);
    window.setTimeout(
      () => setState({ kind: "done", landed: data.landed, prize: data.prize, preview: Boolean(data.preview) }),
      t + 900
    );
  }

  const chosenPositions = board.filter((e) => chosen.includes(e.brandId)).map((e) => e.position);

  return (
    <>
      <div className="card mb-5 flex flex-wrap items-center gap-4 p-5">
        <span className="roundmark">
          {state.kind === "walking" ? <GenieMark />
            : spent ? <IconMoon size={22} /> : <IconHandPick size={22} />}
        </span>
        <div className="min-w-[240px] flex-1">
          <div className="text-[15px] font-semibold">Your shortlist</div>
          <p className="text-[13px] text-ink-soft">
            {spent
              ? "That's your round for today."
              : state.kind === "walking"
                ? "He's choosing between them…"
                : `Tap up to ${PICK_LIMIT} brands you'd actually use. The genie picks one of them — and only one.`}
          </p>
          {error && <p className="mt-1 text-[12px] font-semibold text-warn">{error}</p>}
        </div>

        <div className="flex items-center gap-3">
          <span className="mono text-[13px] text-ink-soft">
            {chosen.length}/{PICK_LIMIT}
          </span>
          <button
            onClick={send}
            disabled={chosen.length === 0 || spent || state.kind === "walking"}
            className="btn btn-primary"
          >
            {state.kind === "walking" ? (
              "Choosing…"
            ) : spent ? (
              "Come back tomorrow"
            ) : (
              <>
                <IconSparkle /> Send the genie
              </>
            )}
          </button>
        </div>
      </div>

      {!signedIn && <PreviewNotice signInHref="/login?next=/try/pick" />}

      {state.kind === "done" && (
        <PrizeCard
          prize={state.prize}
          landed={state.landed}
          preview={state.preview}
          signInHref="/login?next=/try/pick"
        />
      )}

      <div className="board" ref={attachBoard}>
        {Array.from({ length: visibleSlots(board.length) }, (_, i) => {
          const position = i + 1;
          const entry = board[i];
          if (!entry) return <EmptyTile key={position} position={position} />;
          const pickable = stocked(entry);
          return (
            <BoardTile
              key={position}
              entry={entry}
              position={position}
              selectable
              selected={chosen.includes(entry.brandId)}
              hasGenie={ready && token === position && state.kind !== "choosing"}
              outlineColor={
                state.kind === "done" && state.landed === position
                  ? "var(--good)"
                  : !pickable
                    ? undefined
                    : undefined
              }
              onOpen={() => (pickable ? toggle(entry) : setError("That brand has nothing left to give."))}
              // Here a tap shortlists, so the card needs a door of its own.
              onInspect={() => openBrand(entry)}
            />
          );
        })}

        {ready && state.kind !== "choosing" && (
          <span className="genie" style={cellStyle(token)} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/genie.png" alt="" className="genie-img" />
          </span>
        )}
      </div>

      {selected && <BrandSheet entry={selected} onClose={closeBrand} />}

      {chosenPositions.length > 0 && state.kind === "choosing" && (
        <p className="mono mt-4 text-center text-[12px] text-ink-soft">
          shortlisted: {chosenPositions.map((p) => `#${p}`).join(" · ")}
        </p>
      )}
    </>
  );
}
