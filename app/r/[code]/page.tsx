import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { grants } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { isExpired } from "@/lib/rules";
import { ClaimButton } from "@/components/ClaimButton";

export const dynamic = "force-dynamic";

export default async function ClaimPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalised = code.trim().toUpperCase();
  const user = await getSessionUser();

  const grant =
    hasDb && db ? (await db.select().from(grants).where(eq(grants.code, normalised)).limit(1))[0] : undefined;

  const expired = grant ? isExpired(grant.expiresAt) : false;
  const mineAlready = Boolean(grant && user && grant.userId === user.id);

  return (
    <div className="mx-auto max-w-[440px] px-4 py-14">
      <div className="card p-7 text-center">
        {!grant ? (
          <>
            <div className="text-[34px]">🤷</div>
            <h1 className="mt-2 text-[21px] font-semibold">We can&rsquo;t find that reward</h1>
            <p className="mt-1 text-[13.5px] text-ink-soft">
              Check the link in your email — the code is <span className="mono">{normalised}</span>.
            </p>
          </>
        ) : (
          <>
            <div className="text-[38px]">{grant.icon}</div>
            <p className="mt-3 text-[11.5px] font-semibold tracking-wide text-ink-soft uppercase">
              A friend sent you
            </p>
            <h1 className="mt-1 text-[22px] font-semibold">{grant.label}</h1>
            <p className="mt-1 text-[13.5px] text-ink-soft">{grant.brandName}</p>
            <p className="mono mt-4 rounded-lg bg-sunk px-3 py-2.5 text-[14px] font-semibold tracking-wider">
              {normalised}
            </p>
            <p className="mt-2 text-[12.5px] text-ink-soft">
              Use by{" "}
              {grant.expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>

            <div className="mt-6">
              {expired ? (
                <p className="text-[13.5px] font-semibold text-warn">This one expired before it was claimed.</p>
              ) : mineAlready && grant.status === "gifted" ? (
                <p className="text-[13.5px] text-ink-soft">You gave this one away — it&rsquo;s theirs to claim.</p>
              ) : mineAlready ? (
                <Link href="/rewards" className="btn btn-primary w-full">
                  It&rsquo;s already in your rewards
                </Link>
              ) : grant.status === "redeemed" ? (
                <p className="text-[13.5px] text-ink-soft">This one&rsquo;s already been used.</p>
              ) : grant.status !== "gifted" ? (
                <p className="text-[13.5px] text-ink-soft">This reward isn&rsquo;t up for grabs.</p>
              ) : user ? (
                <ClaimButton code={normalised} />
              ) : (
                <>
                  <Link href={`/login?next=/r/${normalised}`} className="btn btn-primary w-full">
                    Sign in to claim it
                  </Link>
                  <p className="mt-2 text-[12px] text-ink-soft">
                    We just need an email to hold the reward against.
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
