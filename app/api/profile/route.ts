import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";

/**
 * Name and mobile, asked once on a customer's first sign-in. Nothing else
 * in the app writes these, and nothing re-asks — if a row already has a
 * name, this route leaves it alone.
 */
export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const rawMobile = typeof body?.mobile === "string" ? body.mobile : "";
  // Accept what people actually type — +91, spaces, dashes — and keep the
  // ten digits that identify the phone.
  const digits = rawMobile.replace(/\D/g, "").replace(/^(?:0|91)/, "");

  if (name.length < 2) {
    return NextResponse.json({ error: "Tell us your name." }, { status: 400 });
  }
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return NextResponse.json({ error: "Enter a 10-digit mobile number." }, { status: 400 });
  }

  await db.update(users).set({ name, mobile: digits }).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true, name, mobile: digits });
}
