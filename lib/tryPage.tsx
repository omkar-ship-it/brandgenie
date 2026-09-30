import { and, eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { plays } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { getBoard } from "@/lib/board";
import { dayKey } from "@/lib/rules";
import type { RoundMode } from "@/lib/round";

/** The example board: showcase brands, and rounds that award nothing. */
export async function loadTry(mode: RoundMode) {
  const user = await getSessionUser();
  const board = await getBoard(true, user?.id);

  let playedToday = false;
  if (user && hasDb && db) {
    const [row] = await db
      .select({ id: plays.id })
      .from(plays)
      .where(and(eq(plays.userId, user.id), eq(plays.dayKey, dayKey()), eq(plays.mode, mode)))
      .limit(1);
    playedToday = Boolean(row);
  }
  return { user, board, playedToday };
}
