import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { brands } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/board";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export const blobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/**
 * Logo upload. Kept to small raster/SVG files and stored on Vercel Blob
 * rather than in Postgres, so the board query stays cheap.
 *
 * Only the signed-in owner of a brand can write its logo, and the previous
 * file is deleted on replace so a brand swapping logos doesn't leave
 * orphans behind.
 */
export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });
  if (!blobConfigured) {
    return NextResponse.json({ error: "Logo uploads aren't configured yet." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const owned = await getBrandForUser(user.id);
  if (!owned) return NextResponse.json({ error: "Save your listing first." }, { status: 400 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Pick a file." }, { status: 400 });
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "PNG, JPG, WebP or SVG only." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Keep the logo under 2MB." }, { status: 400 });
  }

  const ext = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
  const blob = await put(`logos/${owned.brand.id}-${Date.now()}.${ext}`, file, {
    access: "public",
    contentType: file.type,
  });

  const previous = owned.brand.logoUrl;
  await db.update(brands).set({ logoUrl: blob.url }).where(eq(brands.id, owned.brand.id));
  if (previous) await del(previous).catch(() => {});

  return NextResponse.json({ ok: true, logoUrl: blob.url });
}

export async function DELETE() {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const owned = await getBrandForUser(user.id);
  if (!owned?.brand.logoUrl) return NextResponse.json({ ok: true });

  await db.update(brands).set({ logoUrl: null }).where(eq(brands.id, owned.brand.id));
  await del(owned.brand.logoUrl).catch(() => {});
  return NextResponse.json({ ok: true });
}
