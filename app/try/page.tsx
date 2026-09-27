import Link from "next/link";
import { TRY_MODES, modeHref } from "@/lib/tryModes";

export const metadata = { title: "Three boards" };

export default function TryPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
      <header className="mb-7">
        <h1 className="text-[26px] font-semibold">Three ways to run the board</h1>
        <p className="mt-1 max-w-[62ch] text-[13.5px] text-ink-soft">
          Same brands, same rewards, same one-round-a-day. Only the mechanic changes. Each has its own daily
          round, so you can try all three today and compare them properly.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {TRY_MODES.map((m) => (
          <Link key={m.mode} href={modeHref(m.slug)} className="card flex flex-col p-5 transition-transform hover:-translate-y-1">
            <span className="text-[30px]">{m.icon}</span>
            <span className="mono mt-2 text-[11px] tracking-wide text-ink-soft uppercase">{m.tagline}</span>
            <h2 className="mt-1 text-[17px] font-semibold">{m.name}</h2>
            <p className="mt-2 flex-1 text-[13px] text-ink-soft">{m.how}</p>
            <dl className="mt-4 grid gap-2 border-t border-line pt-3 text-[12px]">
              <div>
                <dt className="font-semibold">Player agency</dt>
                <dd className="text-ink-soft">{m.agency}</dd>
              </div>
              <div>
                <dt className="font-semibold">What it does to brands</dt>
                <dd className="text-ink-soft">{m.brandFairness}</dd>
              </div>
            </dl>
            <span className="btn btn-primary mt-4">Try it</span>
          </Link>
        ))}
      </div>

      <div className="card mt-6 p-5">
        <h2 className="text-[15px] font-semibold">What to watch for while testing</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          The mechanics differ in how much they let a player steer, and that lands squarely on the brand side of
          the market. Under the walk, a position is worth what you bid for it because everyone is reached equally.
          Under the other two, players converge on whoever is giving away the most — so the best reward gets
          drained first and a position stops being the thing a brand is buying. Worth deciding whether that is a
          feature or the end of the bidding model.
        </p>
      </div>
    </div>
  );
}
