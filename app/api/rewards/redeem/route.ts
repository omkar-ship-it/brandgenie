import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { grants } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";

export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";

  const [grant] = await db
    .select()
    .from(grants)
    .where(and(eq(grants.code, code), eq(grants.userId, user.id)))
    .limit(1);

  if (!grant) return NextResponse.json({ error: "That reward isn't yours." }, { status: 404 });
  // The whole point of gifting: once shared, it's no longer yours to use.
  if (grant.status === "gifted") {
    return NextResponse.json({ error: "You sent this to a friend — it's theirs now." }, { status: 409 });
  }
  if (grant.status === "redeemed") {
    return NextResponse.json({ error: "Already redeemed." }, { status: 409 });
  }
  if (grant.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "That reward has expired." }, { status: 409 });
  }

  await db
    .update(grants)
    .set({ status: "redeemed", redeemedAt: new Date() })
    .where(eq(grants.id, grant.id));

  return NextResponse.json({ ok: true });
}
