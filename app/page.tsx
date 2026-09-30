import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { plays } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { getBoard } from "@/lib/board";
import { BOARD_SIZE, dayKey, rupees, LISTING_FEE_PAISE } from "@/lib/rules";
import { StopBoard } from "@/components/StopBoard";
import { IconStore, IconTag, IconTrendUp } from "@/components/icons";
import { EmptyBoardCard } from "@/components/boardparts";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const user = await getSessionUser();
  const board = await getBoard(false, user?.id);

  let playedToday = false;
  if (user && hasDb && db) {
    const [play] = await db
      .select({ id: plays.id })
      .from(plays)
      .where(and(eq(plays.userId, user.id), eq(plays.dayKey, dayKey()), eq(plays.mode, "stop")))
      .limit(1);
    playedToday = Boolean(play);
  }

  const isMerchant = user?.role === "merchant";
  const bidHref = isMerchant ? "/brand" : "/login?next=/brand&as=merchant";
  const topVotes = board[0]?.voteCount ?? 0;
  const stock = board.reduce((sum, e) => sum + e.remaining, 0);
  const openPlaces = BOARD_SIZE - board.length;

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold">The Board</h1>
          <p className="mt-1 max-w-[52ch] text-[13.5px] text-ink-soft">
            {BOARD_SIZE} places, ranked by customer votes. Once a day the genie walks it — stop him on the brand
            you want and their reward is yours.
          </p>
        </div>
        <div className="flex gap-5 text-right">
          <Stat label="Brands on" value={`${board.length}/${BOARD_SIZE}`} />
          <Stat label="Most votes" value={String(topVotes)} />
          <Stat label="Rewards left" value={String(stock)} />
        </div>
      </header>

      {!hasDb && (
        <p className="card mb-5 p-4 text-[13px] text-warn">
          No database connected — set <span className="mono">DATABASE_URL</span> to see live listings.
        </p>
      )}

      {board.length === 0 ? (
        <EmptyBoardCard bidHref={bidHref} />
      ) : (
        <StopBoard
          board={board}
          signedIn={Boolean(user)}
          isMerchant={isMerchant}
          playedToday={playedToday}
          backTo="/"
          allowAnonymous={false}
        />
      )}

      {/* The merchant offer gets its own strip rather than a button wedged
          beside Play: what a brand actually weighs — how much room is left
          and what listing costs — sits next to the CTA. */}
      <aside className="bidbar mt-5">
        <IconStore size={24} className="text-gold" />
        <div className="min-w-[200px] flex-1">
          <div className="text-[14.5px] font-semibold">
            {isMerchant
              ? "Your position moves with customer votes"
              : openPlaces > 0
                ? `${openPlaces} of ${BOARD_SIZE} places still open`
                : "The board is full — but new listings still join the list"}
          </div>
          <p className="text-[12.5px] text-ink-soft">
            List for a flat <span className="mono font-semibold">{rupees(LISTING_FEE_PAISE)}</span>. Position isn&rsquo;t
            for sale after that — customers vote you up, and the higher you sit, the sooner the genie reaches you.
          </p>
        </div>
        <Link href={bidHref} className="btn btn-primary">
          {isMerchant ? (
            <>
              <IconTrendUp /> See your votes
            </>
          ) : (
            <>
              <IconTag /> List for {rupees(LISTING_FEE_PAISE)}
            </>
          )}
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
