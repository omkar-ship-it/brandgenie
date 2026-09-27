import Link from "next/link";
import { TRY_MODES, modeHref } from "@/lib/tryModes";

export const metadata = { title: "Three boards" };

export default function TryPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
      <header className="mb-7">
        <h1 className="text-[26px] font-semibold">Three ways to run the board</h1>
        <p className="mt-1 max-w-[62ch] text-[13.5px] text-ink-soft">
          <strong>Stop the genie</strong> is what the board runs on now. The other two are kept here to compare
          against. Same brands, same rewards, same one-round-a-day — each keeps its own daily round, so trying
          one doesn&rsquo;t cost you the others.
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
            <span className="btn btn-primary mt-4">{m.slug === "" ? "Go to the board" : "Try it"}</span>
          </Link>
        ))}
      </div>

      <div className="card mt-6 p-5">
        <h2 className="text-[15px] font-semibold">What to watch for while testing</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          Stop the genie gives players the most control, and that lands squarely on the brand side of the market.
          Under the old walk a position was worth what you bid for it, because every brand was reached equally
          often. Now players stop where they like, so the best reward drains first and the thing a bid buys is
          how <em>soon</em> the genie reaches you rather than whether he does. Position still matters — he starts
          at #1 and walks down — but it is a different promise to sell, and worth saying plainly to brands.
        </p>
      </div>
    </div>
  );
}
