import Link from "next/link";
import { cookies } from "next/headers";
import { CATEGORY_ACCENT, CATEGORY_ICON } from "@/lib/rules";
import { DROPS, DROP_KIND_LABEL } from "@/lib/upcoming";
import { getInterestCounts, getMyInterest } from "@/lib/interest";
import { hue, initials } from "@/lib/tileVisuals";
import { InterestButton } from "@/components/InterestButton";
import { Countdown } from "@/components/Countdown";
import { UpcomingBadge } from "@/components/UpcomingBadge";
import { IconBolt, IconBox, IconGift, IconStore, IconTrendUp } from "@/components/icons";
import type { DropKind } from "@/lib/upcoming";

export const dynamic = "force-dynamic";
export const metadata = { title: "Brand Drops" };

const KIND_ICON: Record<DropKind, typeof IconGift> = {
  reward: IconGift,
  merch: IconBox,
  mystery: IconBox,
  game: IconTrendUp,
};

export default async function DropsPage() {
  const store = await cookies();
  const vid = store.get("bg_vid")?.value;
  const [counts, mine] = await Promise.all([getInterestCounts("drops"), getMyInterest("drops", vid)]);
  const sorted = [...DROPS].sort((a, b) => a.unlocksInHours - b.unlocksInHours);

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8 sm:px-6">
      <div className="teaser-hero" style={{ ["--tint" as string]: "var(--gold)" }}>
        <UpcomingBadge />
        <h1 className="mt-3 flex items-center gap-2 text-[27px] font-semibold">
          <IconBolt size={24} className="text-gold" /> Brand Drops
        </h1>
        <p className="mt-2 max-w-[62ch] text-[14px] text-ink-soft">
          Some rewards don&rsquo;t wait for you to ask. A brand schedules a drop — a reward, a game, merchandise, a
          mystery box — and it stays locked until the moment it doesn&rsquo;t. Customers who show up when it opens
          get first claim; everyone else finds out what they missed.
        </p>
        <p className="mt-3 max-w-[62ch] text-[12.5px] text-ink-soft">
          <strong className="text-ink">This is a concept preview.</strong> The countdowns below are real clocks,
          but nothing actually unlocks behind them yet — each one restarts when you load the page, so you can see
          how a drop would feel without a real launch date to keep. Tell us if it&rsquo;s worth building.
        </p>
      </div>

      <div className="mt-7 grid gap-4">
        {sorted.map((d) => {
          const accent = CATEGORY_ACCENT[d.category] ?? "var(--gold)";
          const h = hue(d.slug);
          const Icon = KIND_ICON[d.kind];
          return (
            <div
              key={d.slug}
              id={d.slug}
              className="card grid gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center"
              style={{ ["--tint" as string]: accent }}
            >
              <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
                <span
                  className="tile-mark"
                  style={{ background: `linear-gradient(140deg, hsl(${h} 62% 46%), hsl(${(h + 34) % 360} 66% 32%))` }}
                >
                  {initials(d.name)}
                </span>
                <div>
                  <div className="text-[13.5px] font-semibold">{d.name}</div>
                  <div className="flex items-center gap-1 text-[10.5px] text-ink-soft">
                    {CATEGORY_ICON[d.category]} {d.category}
                  </div>
                </div>
              </div>

              <div>
                <span className="pill mb-1.5" style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}>
                  <Icon size={12} /> {DROP_KIND_LABEL[d.kind]}
                </span>
                {d.kind === "mystery" ? (
                  <div className="drop-mystery-veil" style={{ ["--tint" as string]: accent }}>
                    ?
                  </div>
                ) : (
                  <>
                    <div className="text-[16px] font-semibold">{d.title}</div>
                    <p className="mt-0.5 text-[12.5px] text-ink-soft">{d.description}</p>
                  </>
                )}
              </div>

              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className="text-right">
                  <div className="text-[10px] font-semibold tracking-wide text-ink-soft uppercase">Unlocks in</div>
                  <Countdown msUntil={d.unlocksInHours * 3_600_000} />
                </div>
                <div className="w-full sm:w-[190px]">
                  <InterestButton module="drops" slug={d.slug} initialCount={counts[d.slug] ?? 0} initiallyIn={mine.has(d.slug)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card mt-7 flex flex-wrap items-center gap-4 p-5">
        <IconStore size={24} className="text-gold" />
        <p className="min-w-[220px] flex-1 text-[13px] text-ink-soft">
          Want to schedule a drop for your own brand once it&rsquo;s built? Tell us on your listing, or write to{" "}
          <a className="lnk" href="mailto:admin@bandicoventures.com">
            admin@bandicoventures.com
          </a>
          .
        </p>
        <Link href="/brand" className="btn btn-primary">
          For brands
        </Link>
      </div>
    </div>
  );
}
