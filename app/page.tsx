import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { plays } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { getBoard } from "@/lib/board";
import { BID_BASE_PAISE, BID_STEP_PAISE, BOARD_SIZE, dayKey, genieStart, rupees } from "@/lib/rules";
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

  const isMerchant = user?.role === "merchant";
  const bidHref = isMerchant ? "/brand" : "/login?next=/brand&as=merchant";
  const topBid = board[0]?.bidPaise ?? 0;
  const stock = board.reduce((sum, e) => sum + e.remaining, 0);
  const openPlaces = BOARD_SIZE - board.length;
  // What it actually costs to get on: the floor while there's room, one step
  // over the cheapest brand once the board is full and you have to displace one.
  const entryPaise = openPlaces > 0
    ? BID_BASE_PAISE
    : Math.max(BID_BASE_PAISE, (board.at(-1)?.bidPaise ?? 0) + BID_STEP_PAISE);

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold">The Board</h1>
          <p className="mt-1 max-w-[52ch] text-[13.5px] text-ink-soft">
            {BOARD_SIZE} places, ranked purely by what each brand bid. The genie walks it once a day and whoever he
            stops on hands you a reward. One board, every brand, wherever you are.
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
          <Link href={bidHref} className="btn btn-primary mt-5">
            🏪 Claim position #1
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

      {/* The merchant offer gets its own strip rather than a button wedged
          beside Play: the two numbers a brand actually weighs — how much
          room is left and what it costs to get in — sit next to the CTA. */}
      <aside className="bidbar mt-5">
        <span className="text-[26px] leading-none">🏪</span>
        <div className="min-w-[200px] flex-1">
          <div className="text-[14.5px] font-semibold">
            {isMerchant
              ? "Move up the board"
              : openPlaces > 0
                ? `${openPlaces} of ${BOARD_SIZE} places still open`
                : "The board is full — outbid someone to get on"}
          </div>
          <p className="text-[12.5px] text-ink-soft">
            From <span className="mono font-semibold">{rupees(entryPaise)}</span>. A bid buys your place in the
            order, never better odds — the genie walks the same board for everyone.
          </p>
        </div>
        <Link href={bidHref} className="btn btn-bid">
          {isMerchant ? "📈 Raise your bid" : "Bid for a spot"}
        </Link>
      </aside>

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
