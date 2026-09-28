import { StopBoard } from "@/components/StopBoard";
import { EmptyBoardCard } from "@/components/boardparts";
import { loadTry } from "@/lib/tryPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Try the board" };

export default async function TryPage() {
  const { user, board } = await loadTry("stop");

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6">
      <header className="mb-5">
        <span className="mono text-[11px] tracking-wide text-ink-soft uppercase">Try it</span>
        <h1 className="mt-1 text-[26px] font-semibold">Stop the genie</h1>
        <p className="mt-1 max-w-[58ch] text-[13.5px] text-ink-soft">
          He walks the board one brand at a time. Stop him where you want and their reward is yours. Play as many
          times as you like here — this is an example board, so nothing is awarded.
        </p>
      </header>

      {board.length === 0 ? (
        <EmptyBoardCard bidHref="/login?next=/brand&as=merchant" playful />
      ) : (
        <StopBoard
          board={board}
          signedIn={Boolean(user)}
          isMerchant={user?.role === "merchant"}
          playedToday={false}
          backTo="/try"
          demo
          showcase
        />
      )}
    </div>
  );
}
