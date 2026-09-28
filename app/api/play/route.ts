import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { db, hasDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getBoard } from "@/lib/board";
import { dayKey, genieStart, PICK_LIMIT, WALK_MAX_STEPS, WALK_MIN_STEPS } from "@/lib/rules";
import { alreadyPlayed, awardLanding, hasStock, isMode, previewPrize } from "@/lib/round";

/**
 * Resolves a round for the two modes that settle in one request: the classic
 * walk, and "pick", where the player has already chosen a shortlist.
 *
 * The whole round is decided here, not in the browser — the client only
 * animates what came back, so a player can't choose where the genie stops or
 * replay the day. ("stop" mode needs two requests; see ./walk.)
 */
export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  const body = await req.json().catch(() => null);
  const mode = isMode(body?.mode) && body.mode !== "stop" ? body.mode : "classic";

  /**
   * The comparison boards run without an account so the mechanics can be
   * shown to anyone. There is nobody to hand a reward to, so a signed-out
   * round resolves and animates but awards nothing, writes no play, and
   * leaves brand stock alone — otherwise demoing the board would quietly
   * drain the rewards real customers are playing for.
   */
  const preview = !user;

  // The round is for customers. A brand playing the board it's paying to be
  // on is a conflict whichever way it lands — they could win their own
  // reward, or be seen to. A preview awards nothing, so it's harmless.
  if (user?.role === "merchant") {
    return NextResponse.json({ error: "The genie's round is for customers." }, { status: 403 });
  }

  const key = dayKey();
  if (user && (await alreadyPlayed(user.id, key, mode))) {
    return NextResponse.json({ error: "You've already had your round today." }, { status: 409 });
  }

  const board = await getBoard();
  if (board.length === 0) {
    return NextResponse.json({ error: "No brands on the board yet." }, { status: 409 });
  }

  // ------------------------------------------------------------- pick
  if (mode === "pick") {
    const wanted: string[] = Array.isArray(body?.brandIds)
      ? body.brandIds.filter((v: unknown) => typeof v === "string")
      : [];
    if (wanted.length > PICK_LIMIT) {
      return NextResponse.json({ error: `Pick at most ${PICK_LIMIT} brands.` }, { status: 400 });
    }

    // Only the player's own shortlist is eligible, and only entries that
    // still have something left — otherwise shortlisting five sold-out
    // brands would burn the day on nothing.
    const shortlist = board.filter((e) => wanted.includes(e.brandId) && hasStock(e));
    if (shortlist.length === 0) {
      return NextResponse.json({ error: "Pick at least one brand with rewards left." }, { status: 400 });
    }

    const chosen = shortlist[randomInt(0, shortlist.length)];
    const result = preview
      ? { prize: previewPrize(chosen) }
      : await awardLanding({
          userId: user!.id,
          dayKey: key,
          mode,
          steps: shortlist.length,
          landed: chosen.position,
          entry: chosen,
        });
    return NextResponse.json({
      ok: true,
      mode,
      preview,
      landed: chosen.position,
      shortlist: shortlist.map((e) => e.position),
      ...result,
    });
  }

  // ---------------------------------------------------------- classic
  const claimed = board.length;
  const start = genieStart(key, claimed);
  let steps = randomInt(WALK_MIN_STEPS, WALK_MAX_STEPS + 1);

  // He won't settle on a brand with nothing left to give — he keeps walking.
  let landed = ((start - 1 + steps) % claimed) + 1;
  for (let guard = 0; guard < claimed && !hasStock(board[landed - 1]); guard++) {
    steps++;
    landed = ((start - 1 + steps) % claimed) + 1;
  }

  const result = preview
    ? { prize: previewPrize(board[landed - 1]) }
    : await awardLanding({
        userId: user!.id,
        dayKey: key,
        mode: "classic",
        steps,
        landed,
        entry: board[landed - 1],
      });
  return NextResponse.json({ ok: true, mode: "classic", preview, start, steps, landed, ...result });
}
