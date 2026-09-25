import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

// Posted from a plain form in the nav, so send the browser somewhere real
// rather than answering with JSON.
export async function POST(req: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
