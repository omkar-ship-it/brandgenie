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
  if (!user) [user] = await db.insert(users).values({ email }).returning();

  await setSessionCookie(await createSession(user.id));
  return NextResponse.json({ ok: true, email: user.email });
}
