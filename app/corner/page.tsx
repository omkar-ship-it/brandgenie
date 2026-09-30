import { cookies } from "next/headers";
import Link from "next/link";
import { CATEGORY_ACCENT, CATEGORY_ICON } from "@/lib/rules";
import { CORNER_BRANDS, GAME_LABEL, GAME_FAMILY } from "@/lib/upcoming";
import { getInterestCounts, getMyInterest } from "@/lib/interest";
import { initials, hue } from "@/lib/tileVisuals";
import { PlayButton } from "@/components/PlayButton";
import { UpcomingBadge } from "@/components/UpcomingBadge";
import {
  IconCards,
  IconClock,
  IconDial,
  IconDice,
  IconGrid,
  IconPin,
  IconQuiz,
  IconShare,
  IconSlot,
  IconStore,
  IconTarget,
  IconWheel,
} from "@/components/icons";
import type { GameKind } from "@/lib/upcoming";

export const dynamic = "force-dynamic";
export const metadata = { title: "Brand Corner" };

const GAME_ICON: Record<GameKind, typeof IconDice> = {
  dice: IconDice,
  wheel: IconWheel,
  timer: IconClock,
  quiz: IconQuiz,
  cards: IconCards,
  slot: IconSlot,
  reflex: IconTarget,
  hunt: IconPin,
  referral: IconShare,
  predict: IconDial,
  match: IconGrid,
};

const FAMILIES = [...new Set(CORNER_BRANDS.map((b) => GAME_FAMILY[b.game]))];

export default async function CornerPage() {
  const store = await cookies();
  const vid = store.get("bg_vid")?.value;
  const [counts, mine] = await Promise.all([getInterestCounts("corner"), getMyInterest("corner", vid)]);

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6">
      <div className="teaser-hero" style={{ ["--tint" as string]: "var(--brand)" }}>
        <UpcomingBadge />
        <h1 className="mt-3 text-[27px] font-semibold">Brand Corner</h1>
        <p className="mt-2 max-w-[62ch] text-[14px] text-ink-soft">
          One link, one mini-game, every platform a brand already posts on. Roll a dice, spin a wheel, stop the
          clock at exactly ten seconds, answer a quiz, hunt for a code, race a friend — a customer plays in seconds
          and walks away with something, wherever they found the link: a bio, a story, a QR code on a receipt.
        </p>
        <p className="mt-3 max-w-[62ch] text-[12.5px] text-ink-soft">
          <strong className="text-ink">This is a concept preview.</strong> None of the games below are built yet —
          tap <strong className="text-ink">Play</strong> to see how each one would work and its own shareable
          link, and tell us if it&rsquo;s worth building.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {FAMILIES.map((f) => (
            <span key={f} className="pill border border-line bg-card text-ink-soft">
              {f}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CORNER_BRANDS.map((b) => {
          const accent = CATEGORY_ACCENT[b.category] ?? "var(--brand)";
          const h = hue(b.slug);
          const Icon = GAME_ICON[b.game];
          return (
            <div key={b.slug} className="card overflow-hidden">
              <div className="h-1.5" style={{ background: accent }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="tile-mark"
                      style={{ background: `linear-gradient(140deg, hsl(${h} 62% 46%), hsl(${(h + 34) % 360} 66% 32%))` }}
                    >
                      {initials(b.name)}
                    </span>
                    <div>
                      <div className="text-[15px] font-semibold">{b.name}</div>
                      <div className="text-[11.5px] text-ink-soft">{b.tagline}</div>
                    </div>
                  </div>
                  <UpcomingBadge size="sm" />
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-xl bg-sunk px-3 py-2.5">
                  <span style={{ color: accent }}>
                    <Icon size={18} />
                  </span>
                  <div>
                    <div className="text-[13px] font-semibold">{GAME_LABEL[b.game]}</div>
                    <div className="text-[10px] tracking-wide text-ink-soft uppercase">{GAME_FAMILY[b.game]}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ink-soft">
                  {CATEGORY_ICON[b.category]} {b.category}
                </div>

                <div className="mt-3 text-[12.5px] text-ink-soft">
                  Winning gives <span className="font-semibold text-ink">{b.reward}</span>
                </div>

                <div className="mt-4">
                  <PlayButton module="corner" slug={b.slug} href={`/corner/${b.slug}`} initialCount={counts[b.slug] ?? 0} initiallyIn={mine.has(b.slug)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card mt-7 flex flex-wrap items-center gap-4 p-5">
        <IconStore size={24} className="text-gold" />
        <p className="min-w-[220px] flex-1 text-[13px] text-ink-soft">
          Want Brand Corner for your own brand once it&rsquo;s built? Tell us on your listing, or write to{" "}
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
