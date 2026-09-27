import { PickBoard } from "@/components/PickBoard";
import { loadTry, TryShell } from "@/lib/tryPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pick your brands" };

export default async function PickPage() {
  const { user, board, playedToday } = await loadTry("pick");
  return (
    <TryShell mode="pick">
      <PickBoard board={board} signedIn={Boolean(user)} playedToday={playedToday} />
    </TryShell>
  );
}
