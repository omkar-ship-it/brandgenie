import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { otpCodes, users } from "@/lib/db/schema";
import { verifyOtpCode } from "@/lib/otp";
import { createSession, setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  if (!hasDb || !db) {
    return NextResponse.json({ error: "Accounts aren't available right now." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const role = body?.role === "merchant" ? "merchant" : "customer";
  if (!email || !code) return NextResponse.json({ error: "Enter the code." }, { status: 400 });

  const [latest] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.email, email), isNull(otpCodes.consumedAt)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!latest || latest.expiresAt.getTime() < Date.now() || !verifyOtpCode(code, latest.codeHash)) {
    return NextResponse.json({ error: "That code is wrong or expired." }, { status: 401 });
  }

  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, latest.id));

  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    [user] = await db.insert(users).values({ email, role }).returning();
  } else if (role === "merchant" && user.role !== "merchant") {
    // Someone who joined as a customer and is now listing a brand gets
    // promoted. There's no path back down — a merchant who signs in on the
    // customer side keeps their console rather than losing it.
    [user] = await db.update(users).set({ role }).where(eq(users.id, user.id)).returning();
  }

  await setSessionCookie(await createSession(user.id));
  // Customers get asked for a name and mobile once; merchants give their
  // details through the brand listing instead.
  const needsProfile = user.role === "customer" && !user.name;
  return NextResponse.json({ ok: true, email: user.email, role: user.role, needsProfile });
}
