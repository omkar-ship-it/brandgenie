import { StopBoard } from "@/components/StopBoard";
import { loadTry, TryShell } from "@/lib/tryPage";
import { EmptyBoardCard } from "@/components/boardparts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stop the genie" };

export default async function StopPage() {
  const { user, board, playedToday } = await loadTry("stop");

  return (
    <TryShell mode="stop">
      {board.length === 0 ? (
        <EmptyBoardCard bidHref="/login?next=/brand&as=merchant" playful />
      ) : (
        <StopBoard
          board={board}
          signedIn={Boolean(user)}
          isMerchant={user?.role === "merchant"}
          playedToday={playedToday}
          demo
          backTo="/try/stop"
        />
      )}
    </TryShell>
  );
}
