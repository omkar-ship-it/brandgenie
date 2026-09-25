import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { brands, rewards } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/board";
import { CATEGORIES, DEFAULT_REWARD_VALID_DAYS } from "@/lib/rules";

const str = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = str(body?.name, 60);
  const category = str(body?.category, 40);
  const tagline = str(body?.tagline, 90);
  const area = str(body?.area, 60);
  const website = str(body?.website, 200) || null;
  const instagram = str(body?.instagram, 200) || null;
  const rewardLabel = str(body?.rewardLabel, 80);
  const rewardIcon = str(body?.rewardIcon, 8) || "🎁";
  const totalStock = Math.max(1, Math.min(500, Number(body?.totalStock) || 25));
  const validDays = Math.max(1, Math.min(365, Number(body?.validDays) || DEFAULT_REWARD_VALID_DAYS));

  if (name.length < 2) return NextResponse.json({ error: "Add your brand name." }, { status: 400 });
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return NextResponse.json({ error: "Pick a category." }, { status: 400 });
  }
  if (rewardLabel.length < 3) {
    return NextResponse.json({ error: "Describe the reward you're giving away." }, { status: 400 });
  }

  const existing = await getBrandForUser(user.id);
  let brandId: string;

  if (existing) {
    await db
      .update(brands)
      .set({ name, category, tagline, area, website, instagram })
      .where(eq(brands.id, existing.brand.id));
    brandId = existing.brand.id;
  } else {
    const [created] = await db
      .insert(brands)
      .values({ userId: user.id, name, category, tagline, area, website, instagram })
      .returning();
    brandId = created.id;
  }

  if (existing?.reward) {
    // Raising the total tops up what's left rather than resetting it, so
    // editing the listing can't quietly wipe out stock already promised.
    const delta = totalStock - existing.reward.totalStock;
    await db
      .update(rewards)
      .set({
        label: rewardLabel,
        icon: rewardIcon,
        totalStock,
        validDays,
        remaining: Math.max(0, existing.reward.remaining + Math.max(0, delta)),
      })
      .where(eq(rewards.id, existing.reward.id));
  } else {
    await db.insert(rewards).values({
      brandId,
      label: rewardLabel,
      icon: rewardIcon,
      totalStock,
      remaining: totalStock,
      validDays,
    });
  }

  return NextResponse.json({ ok: true, brandId });
}
