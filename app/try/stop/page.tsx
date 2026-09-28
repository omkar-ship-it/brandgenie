import Link from "next/link";
import { StopBoard } from "@/components/StopBoard";
import { loadTry, TryShell } from "@/lib/tryPage";
import { EmptyBoardCard } from "@/components/boardparts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stop the genie" };

export default async function StopPage() {
  const { user, board, playedToday } = await loadTry("stop");

  return (
    <TryShell mode="stop">
      {/* This is the mechanic the real board runs, so a signed-in round here
          is the same round — same mode, same daily key. Saying so beats
          letting someone spend their go without realising. */}
      {user && user.role !== "merchant" && (
        <p className="previewbar mb-5">
          <span className="flex-1">
            This is the board the game actually runs on, so playing here uses{" "}
            <strong>your round for today</strong> — not a practice go.
          </span>
          <Link href="/" className="font-semibold underline underline-offset-2">
            Open the real board
          </Link>
        </p>
      )}

      {board.length === 0 ? (
        <EmptyBoardCard bidHref="/login?next=/brand&as=merchant" playful />
      ) : (
        <StopBoard
          board={board}
          signedIn={Boolean(user)}
          isMerchant={user?.role === "merchant"}
          playedToday={playedToday}
          backTo="/try/stop"
        />
      )}
    </TryShell>
  );
}
