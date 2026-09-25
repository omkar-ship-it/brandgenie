import { NextResponse } from "next/server";
import { db, hasDb } from "@/lib/db";
import { otpCodes } from "@/lib/db/schema";
import { generateOtpCode, hashOtpCode, OTP_EXPIRY_MINUTES } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  if (!hasDb || !db) {
    return NextResponse.json({ error: "Accounts aren't available right now." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await db.insert(otpCodes).values({ email, codeHash: hashOtpCode(code), expiresAt });

  const result = await sendOtpEmail(email, code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true });
}
