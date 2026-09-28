import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getBoard, getBrandForUser } from "@/lib/board";
import { razorpayConfigured } from "@/lib/razorpay";
import { BID_BASE_PAISE, BID_STEP_PAISE, BOARD_SIZE, DEFAULT_REWARD_VALID_DAYS, rupees } from "@/lib/rules";
import { IconStore, IconTag } from "@/components/icons";
import { BrandConsole, type BrandDraft } from "@/components/BrandConsole";
import { BrandStatsPanel } from "@/components/BrandStats";
import { getBrandStats, getCouponCounts } from "@/lib/stats";

export const dynamic = "force-dynamic";

const EMPTY: BrandDraft = {
  name: "",
  category: "Food & Beverage",
  tagline: "",
  area: "",
  website: "",
  instagram: "",
  rewardLabel: "",
  rewardIcon: "🎁",
  redemptionType: "counter",
  instructions: "",
  redeemUrl: "",
  totalStock: 25,
  validDays: DEFAULT_REWARD_VALID_DAYS,
};

export default async function BrandPage() {
  const user = await getSessionUser();

  const board = await getBoard();
  const topBid = board[0]?.bidPaise ?? 0;
  const openPlaces = BOARD_SIZE - board.length;
  const entryPaise =
    openPlaces > 0
      ? BID_BASE_PAISE
      : Math.max(BID_BASE_PAISE, (board.at(-1)?.bidPaise ?? 0) + BID_STEP_PAISE);

  /**
   * Signed out this used to be a sign-in wall with nothing on it, which asks
   * a brand to create an account before finding out what any of this costs.
   * Everything here is public anyway — the board shows the prices — so show
   * the offer and let the account come after the decision.
   */
  if (!user) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
        <header className="mb-7 max-w-[62ch]">
          <span className="mono text-[11px] tracking-wide text-ink-soft uppercase">For brands</span>
          <h1 className="mt-1 text-[28px] font-semibold">
            Put your brand where people are already looking for something to try
          </h1>
          <p className="mt-2 text-[14px] text-ink-soft">
            {BOARD_SIZE} places on one board. Customers get a round a day and walk away with a reward from
            whoever they land on. You decide what you&rsquo;re giving away and how much stock to put behind it.
          </p>
        </header>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Figure
            label="Places taken"
            value={`${board.length}/${BOARD_SIZE}`}
            note={openPlaces > 0 ? `${openPlaces} still open` : "outbid someone to get on"}
            tint="#6d3bef"
          />
          <Figure label="Costs from" value={rupees(entryPaise)} note={`rises in ${rupees(BID_STEP_PAISE)} steps`} tint="#0f8b6c" />
          <Figure label="Top bid today" value={rupees(topBid)} note="whoever holds #1" tint="#b4560f" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Step n={1} title="Describe what you're giving away" tint="#2354a6">
            A line about the brand, and one reward — a free coffee, a first-order discount, a trial. You set how
            many and how long they stay valid.
          </Step>
          <Step n={2} title="Pick how it's redeemed" tint="#a6237e">
            At your counter, where staff see a live code on a 30-second timer. Or online, where we hand out one
            of your own single-use discount codes per win.
          </Step>
          <Step n={3} title="Bid for your place" tint="#1789a6">
            Position is purely what you bid, highest first. The higher you sit, the sooner the genie reaches you
            on every walk.
          </Step>
        </div>

        <div className="card mt-6 flex flex-wrap items-center gap-4 p-5">
          <IconStore size={24} className="text-gold" />
          <p className="min-w-[220px] flex-1 text-[13px] text-ink-soft">
            You&rsquo;ll see your tile exactly as customers do, plus how many people opened it, how many rewards
            went out and how many came back redeemed.
          </p>
          <Link href="/login?next=/brand&as=merchant" className="btn btn-primary">
            <IconTag /> Get started
          </Link>
        </div>

        <p className="mt-5 text-center text-[12.5px] text-ink-soft">
          Want to see it from the customer&rsquo;s side first?{" "}
          <Link href="/try/walk" className="font-semibold text-brand underline-offset-2 hover:underline">
            Try a round without signing in
          </Link>
        </p>
      </div>
    );
  }

  const owned = await getBrandForUser(user.id);
  const position = owned ? (board.findIndex((e) => e.brandId === owned.brand.id) + 1 || null) : null;

  const draft: BrandDraft = owned
    ? {
        name: owned.brand.name,
        category: owned.brand.category,
        tagline: owned.brand.tagline,
        area: owned.brand.area,
        website: owned.brand.website ?? "",
        instagram: owned.brand.instagram ?? "",
        rewardLabel: owned.reward?.label ?? "",
        rewardIcon: owned.reward?.icon ?? "🎁",
        redemptionType: owned.reward?.redemptionType ?? "counter",
        instructions: owned.reward?.instructions ?? "",
        redeemUrl: owned.reward?.redeemUrl ?? "",
        totalStock: owned.reward?.totalStock ?? 25,
        validDays: owned.reward?.validDays ?? DEFAULT_REWARD_VALID_DAYS,
      }
    : EMPTY;

  const stats = owned ? await getBrandStats(owned.brand.id, owned.reward?.redemptionType ?? "counter") : null;
  const coupons = owned?.reward ? await getCouponCounts(owned.reward.id) : { total: 0, unused: 0 };
  const currentBid = owned?.brand.bidPaise ?? 0;
  const minPaise = Math.max(BID_BASE_PAISE, currentBid + BID_STEP_PAISE);
  // Enough to clear whoever holds #1 today, rounded up to a whole step.
  const suggested = Math.max(minPaise, Math.ceil((topBid + BID_STEP_PAISE) / BID_STEP_PAISE) * BID_STEP_PAISE);

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-[26px] font-semibold">For brands</h1>
        <p className="mt-1 max-w-[62ch] text-[13.5px] text-ink-soft">
          Signed in as <span className="mono">{user.email}</span>. Position #1 currently costs{" "}
          <span className="mono font-semibold">{rupees(topBid + BID_STEP_PAISE)}</span>.
        </p>
      </header>

      {!razorpayConfigured && (
        <p className="card mb-5 p-4 text-[13px] text-warn">
          <strong>Test mode.</strong> No Razorpay keys are configured, so bids are confirmed without a real payment and
          no card details are taken anywhere in this flow.
        </p>
      )}

      {stats && (
        <div className="mb-5">
          <BrandStatsPanel stats={stats} />
        </div>
      )}

      <BrandConsole
        draft={draft}
        hasBrand={Boolean(owned)}
        logoUrl={owned?.brand.logoUrl ?? null}
        canUploadLogo={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
        coupons={coupons}
        currentBidPaise={currentBid}
        position={position}
        clicks={owned?.brand.clicks ?? 0}
        suggestedPaise={suggested}
        minPaise={minPaise}
      />
    </div>
  );
}

function Figure({ label, value, note, tint }: { label: string; value: string; note: string; tint: string }) {
  return (
    <div className="card liftcard p-4" style={{ ["--tint" as string]: tint }}>
      <div className="text-[10.5px] font-semibold tracking-wide text-ink-soft uppercase">{label}</div>
      <div className="mono liftcard-key mt-1 text-[22px] leading-none font-semibold">{value}</div>
      <div className="mt-1 text-[11.5px] text-ink-soft">{note}</div>
    </div>
  );
}

function Step({
  n,
  title,
  tint,
  children,
}: {
  n: number;
  title: string;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card liftcard p-5" style={{ ["--tint" as string]: tint }}>
      <span
        className="mono grid h-6 w-6 place-items-center rounded-lg text-[11px] font-semibold text-white"
        style={{ background: tint }}
      >
        {n}
      </span>
      <h2 className="mt-2 text-[14.5px] font-semibold">{title}</h2>
      <p className="mt-1 text-[12.5px] text-ink-soft">{children}</p>
    </div>
  );
}
