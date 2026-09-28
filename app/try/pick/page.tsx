import { PickBoard } from "@/components/PickBoard";
import { loadTry, TryShell } from "@/lib/tryPage";
import { EmptyBoardCard } from "@/components/boardparts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pick your brands" };

export default async function PickPage() {
  const { user, board, playedToday } = await loadTry("pick");
  return (
    <TryShell mode="pick">
      {board.length === 0 ? (
        <EmptyBoardCard bidHref="/login?next=/brand&as=merchant" playful />
      ) : (
        <PickBoard board={board} signedIn={Boolean(user)} playedToday={playedToday} demo />
      )}
    </TryShell>
  );
}
