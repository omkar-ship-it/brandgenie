import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { plays } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { getBoard } from "@/lib/board";
import { BOARD_SIZE, dayKey, genieStart, rupees } from "@/lib/rules";
import { Board } from "@/components/Board";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const user = await getSessionUser();
  const board = await getBoard();

  let playedToday = false;
  if (user && hasDb && db) {
    const [play] = await db
      .select({ id: plays.id })
      .from(plays)
      .where(and(eq(plays.userId, user.id), eq(plays.dayKey, dayKey())))
      .limit(1);
    playedToday = Boolean(play);
  }

  const topBid = board[0]?.bidPaise ?? 0;
  const stock = board.reduce((sum, e) => sum + e.remaining, 0);

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold">The Board</h1>
          <p className="mt-1 max-w-[52ch] text-[13.5px] text-ink-soft">
            {BOARD_SIZE} places, ranked purely by what each brand bid. The genie walks it once a day and whoever he
            stops on hands you a reward.
          </p>
        </div>
        <div className="flex gap-5 text-right">
          <Stat label="Brands on" value={`${board.length}/${BOARD_SIZE}`} />
          <Stat label="Top bid" value={rupees(topBid)} />
          <Stat label="Rewards left" value={String(stock)} />
        </div>
      </header>

      {!hasDb && (
        <p className="card mb-5 p-4 text-[13px] text-warn">
          No database connected — set <span className="mono">DATABASE_URL</span> to see live bids.
        </p>
      )}

      {board.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-[34px]">🪔</div>
          <h2 className="mt-2 text-[18px] font-semibold">Nobody&rsquo;s on the board yet</h2>
          <p className="mx-auto mt-1 max-w-[40ch] text-[13.5px] text-ink-soft">
            The first brand to bid takes position #1 and stays there until someone outbids them.
          </p>
          <Link href="/brand" className="btn btn-primary mt-5">
            Claim position #1
          </Link>
        </div>
      ) : (
        <Board
          board={board}
          signedIn={Boolean(user)}
          playedToday={playedToday}
          startPosition={genieStart(dayKey(), board.length)}
        />
      )}

      <p className="mt-5 text-center text-[12.5px] text-ink-soft">
        A bid buys a place on the board, never better odds — the walk is the same for everyone.{" "}
        <Link href="/brand" className="font-semibold text-brand underline-offset-2 hover:underline">
          Put your brand on it
        </Link>
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold tracking-wide text-ink-soft uppercase">{label}</div>
      <div className="mono text-[17px] font-semibold">{value}</div>
    </div>
  );
}
