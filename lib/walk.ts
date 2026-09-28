import { createHmac, timingSafeEqual } from "crypto";

export const WALK_TICK_MS = 260;
/** He gives up after this long, so a round can't be left open forever. */
export const WALK_MAX_MS = 25_000;

export type WalkPlan = {
  /** Empty on a preview — there is no account behind it. */
  userId: string;
  dayKey: string;
  startedAt: number;
  order: number[];
  /**
   * Signed into the plan rather than inferred at stop time, so a signed-out
   * round can never be replayed by a signed-in session to claim a real
   * reward: the token itself says which kind of round it is.
   */
  preview: boolean;
  /** Which board the walk was planned on, so the stop resolves against it. */
  demo?: boolean;
};

/**
 * "Stop the genie" is the one mode the browser has to time, so the plan is
 * signed on the way out and checked on the way back. The client can still
 * choose *when* to stop — that's the game — but it can't invent a landing,
 * reorder the walk, replay someone else's round, or claim to have stopped
 * at a moment that never happened.
 */
function secret() {
  // A dedicated APP_SECRET is better, but falling back to the connection
  // string keeps this stable per environment rather than regenerating on
  // every cold start, which would void tokens mid-round.
  return process.env.APP_SECRET ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? "dev-only-secret";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function encodeWalk(plan: WalkPlan): string {
  const payload = Buffer.from(JSON.stringify(plan)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeWalk(token: unknown): WalkPlan | null {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;

  const expected = Buffer.from(sign(payload), "utf8");
  const given = Buffer.from(mac, "utf8");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const plan = JSON.parse(Buffer.from(payload, "base64url").toString()) as WalkPlan;
    if (!Array.isArray(plan?.order) || plan.order.length === 0) return null;
    if (!plan.preview && !plan.userId) return null;
    return plan;
  } catch {
    return null;
  }
}

/** Which tile he is on after this long, given the signed order. */
export function positionAt(plan: WalkPlan, elapsedMs: number) {
  const index = Math.floor(elapsedMs / WALK_TICK_MS) % plan.order.length;
  return plan.order[index];
}

/**
 * The claimed stop has to match the wall clock. Without this, a client could
 * wait as long as it liked, work out which elapsed time lands on the best
 * tile, and send that instead of the moment it actually pressed stop.
 */
export function elapsedIsPlausible(plan: WalkPlan, elapsedMs: number, now = Date.now()) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs > WALK_MAX_MS) return false;
  const real = now - plan.startedAt;
  // Generous upper slack for a slow network; tight lower bound because
  // claiming *less* time than has passed is the direction that cheats.
  return real >= elapsedMs - 1_000 && real <= elapsedMs + 6_000;
}
