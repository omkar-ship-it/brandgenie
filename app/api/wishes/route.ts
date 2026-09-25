import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { wishes } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { CATEGORIES, dayKey, isWishWindowOpen, WISHES_PER_DAY } from "@/lib/rules";

export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to make a wish." }, { status: 401 });

  // The window is checked on the server — the countdown in the browser is
  // only ever a hint, never the gate.
  if (!isWishWindowOpen()) {
    return NextResponse.json({ error: "Wishes only open at 11:11." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 160) : "";
  const category = typeof body?.category === "string" ? body.category.trim() : "";
  if (text.length < 4) return NextResponse.json({ error: "Say what you're wishing for." }, { status: 400 });
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return NextResponse.json({ error: "Pick a category." }, { status: 400 });
  }

  const key = dayKey();
  const mine = await db
    .select({ id: wishes.id })
    .from(wishes)
    .where(and(eq(wishes.userId, user.id), eq(wishes.dayKey, key)));

  if (mine.length >= WISHES_PER_DAY) {
    return NextResponse.json({ error: `That's both your wishes for today.` }, { status: 429 });
  }

  const [wish] = await db.insert(wishes).values({ userId: user.id, text, category, dayKey: key }).returning();
  return NextResponse.json({ ok: true, wish: { id: wish.id, text: wish.text, category: wish.category } });
}
