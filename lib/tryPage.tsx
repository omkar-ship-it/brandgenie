import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { plays } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { getBoard } from "@/lib/board";
import { dayKey } from "@/lib/rules";
import { TRY_MODES, modeHref, type TryIcon } from "@/lib/tryModes";
import { IconClock, IconHandPick, IconPlay } from "@/components/icons";
import type { RoundMode } from "@/lib/round";

/** Everything the two experiment pages share but the board component. */
export async function loadTry(mode: RoundMode) {
  const user = await getSessionUser();
  const board = await getBoard();

  let playedToday = false;
  if (user && hasDb && db) {
    const [row] = await db
      .select({ id: plays.id })
      .from(plays)
      .where(and(eq(plays.userId, user.id), eq(plays.dayKey, dayKey()), eq(plays.mode, mode)))
      .limit(1);
    playedToday = Boolean(row);
  }
  return { user, board, playedToday };
}

export function TryIconFor({ name, size = 14 }: { name: TryIcon; size?: number }) {
  if (name === "pick") return <IconHandPick size={size} />;
  if (name === "stop") return <IconClock size={size} />;
  return <IconPlay size={size} />;
}

export function TryShell({
  mode,
  children,
}: {
  mode: RoundMode;
  children: React.ReactNode;
}) {
  const meta = TRY_MODES.find((m) => m.mode === mode)!;
  return (
    <div className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6">
      <nav className="mb-5 flex flex-wrap items-center gap-2">
        {TRY_MODES.map((m) => (
          <Link
            key={m.mode}
            href={modeHref(m.slug)}
            className={`pill border ${m.mode === mode ? "border-brand bg-brand text-white" : "border-line bg-card text-ink-soft"}`}
          >
            <TryIconFor name={m.icon} /> {m.name}
          </Link>
        ))}
        <Link href="/try" className="ml-auto text-[12px] text-ink-soft underline-offset-2 hover:underline">
          compare all three
        </Link>
      </nav>

      <header className="mb-5">
        <span className="mono text-[11px] tracking-wide text-ink-soft uppercase">{meta.tagline}</span>
        <h1 className="mt-1 text-[26px] font-semibold">{meta.name}</h1>
        <p className="mt-1 max-w-[58ch] text-[13.5px] text-ink-soft">{meta.how}</p>
      </header>

      {children}
    </div>
  );
}
