import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getBoard, getBrandForUser } from "@/lib/board";
import { razorpayConfigured } from "@/lib/razorpay";
import { BID_BASE_PAISE, BID_STEP_PAISE, DEFAULT_REWARD_VALID_DAYS, rupees } from "@/lib/rules";
import { BrandConsole, type BrandDraft } from "@/components/BrandConsole";

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
  totalStock: 25,
  validDays: DEFAULT_REWARD_VALID_DAYS,
};

export default async function BrandPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-[460px] px-4 py-16 text-center">
        <div className="text-[34px]">🏪</div>
        <h1 className="mt-2 text-[22px] font-semibold">For brands</h1>
        <p className="mx-auto mt-2 max-w-[38ch] text-[13.5px] text-ink-soft">
          Sign in with your email, describe what you&rsquo;re giving away, and bid for a place on the board.
        </p>
        <Link href="/login?next=/brand" className="btn btn-primary mt-6">
          Sign in with email
        </Link>
      </div>
    );
  }

  const owned = await getBrandForUser(user.id);
  const board = await getBoard();
  const position = owned ? (board.findIndex((e) => e.brandId === owned.brand.id) + 1 || null) : null;
  const topBid = board[0]?.bidPaise ?? 0;

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
        totalStock: owned.reward?.totalStock ?? 25,
        validDays: owned.reward?.validDays ?? DEFAULT_REWARD_VALID_DAYS,
      }
    : EMPTY;

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

      <BrandConsole
        draft={draft}
        hasBrand={Boolean(owned)}
        currentBidPaise={currentBid}
        position={position}
        suggestedPaise={suggested}
        minPaise={minPaise}
      />
    </div>
  );
}
