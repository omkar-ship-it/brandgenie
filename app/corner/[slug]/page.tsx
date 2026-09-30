import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { CATEGORY_ACCENT, CATEGORY_ICON } from "@/lib/rules";
import { CORNER_BRANDS, GAME_LABEL, GAME_FAMILY, findCornerBrand } from "@/lib/upcoming";
import { getInterestCounts, getMyInterest } from "@/lib/interest";
import { initials, hue } from "@/lib/tileVisuals";
import { PlayButton } from "@/components/PlayButton";
import { CopyLinkButton } from "@/components/CopyLinkButton";
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
  IconTarget,
  IconWheel,
} from "@/components/icons";
import type { GameKind } from "@/lib/upcoming";

export const dynamic = "force-dynamic";

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

/**
 * This exact page is the thing being tested — a brand's own URL for its
 * game, real enough to drop into a bio or a WhatsApp status right now, even
 * though the game behind it isn't built. If the click-throughs and interest
 * count justify it, this address is what the real game eventually lives at.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = findCornerBrand(slug);
  return { title: brand ? `${brand.name} · Brand Corner` : "Brand Corner" };
}

export default async function CornerBrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = findCornerBrand(slug);
  if (!brand) notFound();

  const store = await cookies();
  const vid = store.get("bg_vid")?.value;
  const [counts, mine] = await Promise.all([getInterestCounts("corner"), getMyInterest("corner", vid)]);

  const accent = CATEGORY_ACCENT[brand.category] ?? "var(--brand)";
  const h = hue(brand.slug);
  const Icon = GAME_ICON[brand.game];

  return (
    <div className="mx-auto max-w-[640px] px-4 py-10 sm:px-6">
      <Link href="/corner" className="text-[12.5px] text-ink-soft hover:text-ink hover:underline">
        ← All of Brand Corner
      </Link>

      <div className="card mt-4 overflow-hidden">
        <div className="h-2" style={{ background: accent }} />
        <div className="p-7 text-center">
          <div className="flex justify-center">
            <UpcomingBadge />
          </div>

          <span
            className="tile-mark mx-auto mt-4"
            style={{
              background: `linear-gradient(140deg, hsl(${h} 62% 46%), hsl(${(h + 34) % 360} 66% 32%))`,
              width: 64,
              height: 64,
              fontSize: 20,
            }}
          >
            {initials(brand.name)}
          </span>
          <h1 className="mt-3 text-[24px] font-semibold">{brand.name}</h1>
          <p className="mt-1 text-[13.5px] text-ink-soft">{brand.tagline}</p>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-soft">
            {CATEGORY_ICON[brand.category]} {brand.category}
          </div>

          <div className="mx-auto mt-6 flex max-w-[320px] items-center justify-center gap-3 rounded-2xl bg-sunk px-5 py-6">
            <span style={{ color: accent }}>
              <Icon size={34} />
            </span>
            <div className="text-left">
              <div className="text-[19px] font-semibold">{GAME_LABEL[brand.game]}</div>
              <div className="text-[10.5px] tracking-wide text-ink-soft uppercase">{GAME_FAMILY[brand.game]} game</div>
            </div>
          </div>

          <div className="mx-auto mt-5 max-w-[400px] rounded-xl border border-line p-4 text-left">
            <div className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">Winning gives you</div>
            <div className="mt-1 text-[15px] font-semibold">{brand.reward}</div>
          </div>

          <p className="mx-auto mt-6 max-w-[46ch] text-[13px] text-ink-soft">
            This is a concept preview — the game itself isn&rsquo;t built yet. This page is {brand.name}&rsquo;s
            own link for it, the same one they&rsquo;d share on Instagram, WhatsApp, or a QR code at the counter
            once it&rsquo;s real. Tapping Play just tells us you would.
          </p>

          <div className="mx-auto mt-6 grid max-w-[320px] gap-2">
            <PlayButton module="corner" slug={brand.slug} initialCount={counts[brand.slug] ?? 0} initiallyIn={mine.has(brand.slug)} />
            <CopyLinkButton />
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-[12.5px] text-ink-soft">
        See {CORNER_BRANDS.length - 1} more preview games on{" "}
        <Link href="/corner" className="font-semibold text-brand underline-offset-2 hover:underline">
          Brand Corner
        </Link>
        .
      </p>
    </div>
  );
}
