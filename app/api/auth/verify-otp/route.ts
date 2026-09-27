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

  // Every outstanding code is checked, not just the newest.
  //
  // Only-the-latest looks tidy but breaks the common case: ask for a code,
  // the mail is slow, ask again — now the first mail to arrive carries a
  // code the server refuses, with no way for the person to know which of two
  // identical-looking emails is the live one. Capped at five so a flood of
  // requests can't turn one sign-in into unbounded scrypt work.
  const outstanding = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.email, email), isNull(otpCodes.consumedAt)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(5);

  const match = outstanding.find((row) => verifyOtpCode(code, row.codeHash));
  if (!match) {
    return NextResponse.json({ error: "That code isn't right. Check the latest email." }, { status: 401 });
  }
  if (match.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "That code has expired — send yourself a new one." }, { status: 401 });
  }

  // Signing in retires every other code outstanding for this address, so an
  // older mail sitting in an inbox can't be replayed later.
  await db
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(otpCodes.email, email), isNull(otpCodes.consumedAt)));

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
