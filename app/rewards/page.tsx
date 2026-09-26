import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { brands, grants } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { isExpired } from "@/lib/rules";
import { RewardList, type RewardCard } from "@/components/RewardList";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-[460px] px-4 py-16 text-center">
        <div className="text-[34px]">🎟️</div>
        <h1 className="mt-2 text-[22px] font-semibold">Your rewards</h1>
        <p className="mx-auto mt-2 max-w-[36ch] text-[13.5px] text-ink-soft">
          Sign in to see what the genie has handed you.
        </p>
        <Link href="/login?next=/rewards" className="btn btn-primary mt-6">
          Sign in with email
        </Link>
      </div>
    );
  }

  let cards: RewardCard[] = [];
  if (hasDb && db) {
    const rows = await db
      .select({
        code: grants.code,
        brandName: grants.brandName,
        label: grants.label,
        icon: grants.icon,
        status: grants.status,
        expiresAt: grants.expiresAt,
        redeemedAt: grants.redeemedAt,
        giftedToEmail: grants.giftedToEmail,
        giftedByUserId: grants.giftedByUserId,
        category: brands.category,
      })
      .from(grants)
      .leftJoin(brands, eq(grants.brandId, brands.id))
      .where(eq(grants.userId, user.id))
      .orderBy(desc(grants.createdAt));

    cards = rows.map((r) => ({
      code: r.code,
      brandName: r.brandName,
      label: r.label,
      icon: r.icon,
      status: r.status,
      category: r.category ?? "",
      expiresAt: r.expiresAt.toISOString(),
      redeemedAt: r.redeemedAt?.toISOString() ?? null,
      giftedToEmail: r.giftedToEmail,
      // Someone else put this in their hands — worth saying so on the card.
      wasGifted: Boolean(r.giftedByUserId && r.giftedByUserId !== user.id),
    }));
  }

  const live = cards.filter((c) => c.status === "active" && !isExpired(c.expiresAt)).length;

  return (
    <div className="mx-auto max-w-[840px] px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-[26px] font-semibold">Your rewards</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          {live > 0 ? `${live} ready to use.` : "Nothing ready to use right now."} Every reward has an expiry, and
          anything you send to a friend stops being yours.
        </p>
      </header>

      {cards.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-[34px]">🧞</div>
          <h2 className="mt-2 text-[18px] font-semibold">Nothing yet</h2>
          <p className="mx-auto mt-1 max-w-[38ch] text-[13.5px] text-ink-soft">
            You get one round a day. Wake the genie and see where he stops.
          </p>
          <Link href="/" className="btn btn-primary mt-5">
            Go to the board
          </Link>
        </div>
      ) : (
        <RewardList rewards={cards} />
      )}
    </div>
  );
}
