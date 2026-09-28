import { Board } from "@/components/Board";
import { dayKey, genieStart } from "@/lib/rules";
import { loadTry, TryShell } from "@/lib/tryPage";
import { EmptyBoardCard } from "@/components/boardparts";

export const dynamic = "force-dynamic";
export const metadata = { title: "The walk" };

export default async function WalkPage() {
  const { user, board, playedToday } = await loadTry("classic");
  return (
    <TryShell mode="classic">
      {/* Two things are being compared on this page at once, so say which
          is which rather than letting the grid read as part of the walk. */}
      <p className="previewbar mb-5">
        <span className="flex-1">
          <strong>Grid experiment.</strong> Here a bid buys space as well as rank — #1 takes four squares, #2
          and #3 take two. On the live board every brand gets the same tile whatever they paid.
        </span>
      </p>

      {board.length === 0 ? (
        <EmptyBoardCard bidHref="/login?next=/brand&as=merchant" playful />
      ) : (
        <Board
          board={board}
          signedIn={Boolean(user)}
          isMerchant={user?.role === "merchant"}
          playedToday={playedToday}
          demo
          startPosition={genieStart(dayKey(), Math.max(1, board.length))}
          showcase
        />
      )}
    </TryShell>
  );
}
