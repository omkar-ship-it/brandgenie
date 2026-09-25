import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { wishes } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { CATEGORY_ICON, dayKey, isWishWindowOpen, msUntilWishWindow, WISHES_PER_DAY } from "@/lib/rules";
import { WishWindow, type MyWish } from "@/components/WishWindow";

export const dynamic = "force-dynamic";

export default async function WishPage() {
  const user = await getSessionUser();
  const open = isWishWindowOpen();
  const msUntil = msUntilWishWindow();

  let mine: MyWish[] = [];
  let recent: { id: string; text: string; category: string }[] = [];

  if (hasDb && db) {
    if (user) {
      const rows = await db
        .select()
        .from(wishes)
        .where(and(eq(wishes.userId, user.id), eq(wishes.dayKey, dayKey())))
        .orderBy(desc(wishes.createdAt));
      mine = rows.map((w) => ({
        id: w.id,
        text: w.text,
        category: w.category,
        at: w.createdAt.toISOString(),
      }));
    }
    recent = await db
      .select({ id: wishes.id, text: wishes.text, category: wishes.category })
      .from(wishes)
      .orderBy(desc(wishes.createdAt))
      .limit(12);
  }

  return (
    <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-6">
      <header className="mb-6 text-center">
        <h1 className="text-[26px] font-semibold">Make a wish</h1>
        <p className="mx-auto mt-1 max-w-[46ch] text-[13.5px] text-ink-soft">
          Twice a day, at 11:11 exactly, the genie listens. Two wishes each — brands read them and pick some to grant.
        </p>
      </header>

      {user ? (
        <WishWindow open={open} msUntil={msUntil} used={mine.length} mine={mine} />
      ) : (
        <div className="card p-8 text-center">
          <div className="text-[34px]">{open ? "🌟" : "🕚"}</div>
          <h2 className="mt-2 text-[19px] font-semibold">
            {open ? "The window is open right now" : "Sign in before 11:11"}
          </h2>
          <p className="mx-auto mt-1 max-w-[36ch] text-[13.5px] text-ink-soft">
            You get {WISHES_PER_DAY} wishes a day, and we need an email to tie them to.
          </p>
          <Link href="/login?next=/wish" className="btn btn-primary mt-5">
            Sign in with email
          </Link>
        </div>
      )}

      {recent.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-3 text-[12px] font-semibold tracking-wide text-ink-soft uppercase">
            What people are wishing for
          </h3>
          <ul className="flex flex-wrap gap-2">
            {recent.map((w) => (
              <li key={w.id} className="card px-3.5 py-2.5 text-[13px]">
                <span className="mr-1.5">{CATEGORY_ICON[w.category] ?? "✨"}</span>
                {w.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
