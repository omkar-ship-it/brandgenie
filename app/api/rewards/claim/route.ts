import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { grants } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";

/** The friend takes ownership — after this only they can redeem it. */
export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to claim it." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";

  const [grant] = await db.select().from(grants).where(eq(grants.code, code)).limit(1);
  if (!grant) return NextResponse.json({ error: "We couldn't find that reward." }, { status: 404 });
  if (grant.status !== "gifted") {
    return NextResponse.json({ error: "That reward isn't up for grabs." }, { status: 409 });
  }
  if (grant.userId === user.id) {
    return NextResponse.json({ error: "You gave this one away." }, { status: 409 });
  }
  if (grant.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "That reward has expired." }, { status: 409 });
  }

  await db
    .update(grants)
    .set({ userId: user.id, status: "active", giftedToEmail: user.email })
    .where(eq(grants.id, grant.id));

  return NextResponse.json({ ok: true });
}
