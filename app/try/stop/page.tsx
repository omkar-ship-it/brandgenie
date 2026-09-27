import { StopBoard } from "@/components/StopBoard";
import { loadTry, TryShell } from "@/lib/tryPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stop the genie" };

export default async function StopPage() {
  const { user, board, playedToday } = await loadTry("stop");
  return (
    <TryShell mode="stop">
      <StopBoard board={board} signedIn={Boolean(user)} playedToday={playedToday} />
    </TryShell>
  );
}
