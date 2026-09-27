import { NextResponse } from "next/server";
import { db, hasDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getBoard } from "@/lib/board";
import { dayKey } from "@/lib/rules";
import { alreadyPlayed, awardLanding } from "@/lib/round";
import { decodeWalk, elapsedIsPlausible, encodeWalk, positionAt, WALK_MAX_MS, WALK_TICK_MS } from "@/lib/walk";

/** Start the walk: hand back a signed plan the browser animates. */
export async function GET() {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to play." }, { status: 401 });
  if (user.role === "merchant") {
    return NextResponse.json({ error: "The genie's round is for customers." }, { status: 403 });
  }

  const key = dayKey();
  if (await alreadyPlayed(user.id, key, "stop")) {
    return NextResponse.json({ error: "You've already had your round today." }, { status: 409 });
  }

  const board = await getBoard();
  if (board.length === 0) return NextResponse.json({ error: "No brands on the board yet." }, { status: 409 });

  // He walks every paid position in board order, sold-out ones included —
  // they're visibly marked, and stopping on one is the player's own call.
  // That's the point of the mode: the choice, and its consequence, are theirs.
  const plan = {
    userId: user.id,
    dayKey: key,
    startedAt: Date.now(),
    order: board.map((e) => e.position),
  };

  return NextResponse.json({
    ok: true,
    token: encodeWalk(plan),
    tickMs: WALK_TICK_MS,
    maxMs: WALK_MAX_MS,
    order: plan.order,
  });
}

/** Stop him: the browser says when, the server says where that lands. */
export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to play." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const plan = decodeWalk(body?.token);
  if (!plan) return NextResponse.json({ error: "That round isn't valid." }, { status: 400 });
  if (plan.userId !== user.id) return NextResponse.json({ error: "That round isn't yours." }, { status: 403 });

  const elapsedMs = Number(body?.elapsedMs);
  if (!elapsedIsPlausible(plan, elapsedMs)) {
    return NextResponse.json({ error: "We couldn't time that stop. Start again." }, { status: 400 });
  }

  const key = dayKey();
  if (plan.dayKey !== key) return NextResponse.json({ error: "That round has expired." }, { status: 409 });
  if (await alreadyPlayed(user.id, key, "stop")) {
    return NextResponse.json({ error: "You've already had your round today." }, { status: 409 });
  }

  const landed = positionAt(plan, elapsedMs);
  const board = await getBoard();
  const entry = board[landed - 1];

  const result = await awardLanding({
    userId: user.id,
    dayKey: key,
    mode: "stop",
    steps: Math.floor(elapsedMs / WALK_TICK_MS),
    landed,
    entry,
  });

  return NextResponse.json({ ok: true, mode: "stop", landed, elapsedMs, ...result });
}
