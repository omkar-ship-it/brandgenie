import { Board } from "@/components/Board";
import { dayKey, genieStart } from "@/lib/rules";
import { loadTry, TryShell } from "@/lib/tryPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "The walk" };

export default async function WalkPage() {
  const { user, board, playedToday } = await loadTry("classic");
  return (
    <TryShell mode="classic">
      <Board
        board={board}
        signedIn={Boolean(user)}
        isMerchant={user?.role === "merchant"}
        playedToday={playedToday}
        startPosition={genieStart(dayKey(), Math.max(1, board.length))}
      />
    </TryShell>
  );
}
