"use client";

import { useState } from "react";
import { CATEGORY_ACCENT } from "@/lib/rules";

export type RewardCard = {
  code: string;
  brandName: string;
  label: string;
  icon: string;
  status: string;
  category: string;
  expiresAt: string;
  giftedToEmail: string | null;
  wasGifted: boolean;
};

function daysLeft(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function RewardList({ rewards }: { rewards: RewardCard[] }) {
  const [giftFor, setGiftFor] = useState<RewardCard | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");

  async function redeem(code: string) {
    setBusy(code);
    setError("");
    const res = await fetch("/api/rewards/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) return setError(data.error ?? "Couldn't redeem that.");
    window.location.reload();
  }

  async function gift() {
    if (!giftFor) return;
    setBusy(giftFor.code);
    setError("");
    const res = await fetch("/api/rewards/gift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: giftFor.code, email }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) return setError(data.error ?? "Couldn't send that.");
    setSentTo(email);
  }

  function closeSheet() {
    setGiftFor(null);
    setEmail("");
    setError("");
    if (sentTo) {
      setSentTo("");
      window.location.reload();
    }
  }

  return (
    <>
      {error && !giftFor && <p className="mb-4 text-[13px] font-semibold text-warn">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {rewards.map((r) => {
          const left = daysLeft(r.expiresAt);
          const expired = left <= 0;
          const usable = r.status === "active" && !expired;
          const accent = CATEGORY_ACCENT[r.category] ?? "var(--brand)";

          return (
            <article key={r.code} className={`card overflow-hidden ${usable ? "" : "opacity-70"}`}>
              <div className="h-1.5" style={{ background: accent }} />
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <span className="text-[26px] leading-none">{r.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold">{r.label}</div>
                    <div className="text-[12.5px] text-ink-soft">{r.brandName}</div>
                  </div>
                  <Badge status={r.status} expired={expired} wasGifted={r.wasGifted} />
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg bg-sunk px-3 py-2.5">
                  <span className="mono text-[15px] font-semibold tracking-wider">{r.code}</span>
                  <span className={`mono text-[11.5px] ${expired ? "text-warn" : "text-ink-soft"}`}>
                    {expired ? `expired ${dateFmt(r.expiresAt)}` : `${left}d left · ${dateFmt(r.expiresAt)}`}
                  </span>
                </div>

                {r.status === "gifted" && (
                  <p className="mt-3 text-[12.5px] text-ink-soft">
                    Sent to <span className="mono">{r.giftedToEmail}</span> — it&rsquo;s theirs to redeem now, not
                    yours.
                  </p>
                )}
                {r.status === "redeemed" && <p className="mt-3 text-[12.5px] text-ink-soft">Redeemed. Hope it was good.</p>}

                {usable && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button onClick={() => redeem(r.code)} disabled={busy === r.code} className="btn btn-primary">
                      {busy === r.code ? "…" : "Redeem"}
                    </button>
                    <button onClick={() => setGiftFor(r)} className="btn btn-ghost">
                      🎁 Gift it
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* --------------------------------- gift sheet */}
      {giftFor && (
        <div
          className="backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Send to a friend"
          onClick={(e) => e.target === e.currentTarget && closeSheet()}
        >
          <div className="sheet p-6">
            {sentTo ? (
              <>
                <div className="text-[30px]">📬</div>
                <h2 className="mt-2 text-[19px] font-semibold">On its way</h2>
                <p className="mt-1 text-[13.5px] text-ink-soft">
                  We emailed <span className="mono">{sentTo}</span> a link to claim{" "}
                  <strong>{giftFor.label}</strong>. It&rsquo;s out of your hands now — you can&rsquo;t redeem this one
                  any more.
                </p>
              </>
            ) : (
              <>
                <div className="text-[30px]">{giftFor.icon}</div>
                <h2 className="mt-2 text-[19px] font-semibold">Send {giftFor.label}?</h2>
                <p className="mt-1 text-[13.5px] text-ink-soft">
                  Giving it away is final: once it&rsquo;s sent, only your friend can redeem it. It still expires{" "}
                  {dateFmt(giftFor.expiresAt)}.
                </p>

                <label className="label mt-5">Their email</label>
                <input
                  className="input"
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@email.com"
                  onKeyDown={(e) => e.key === "Enter" && gift()}
                />
                {error && <p className="mt-2 text-[12.5px] font-semibold text-warn">{error}</p>}

                <button onClick={gift} disabled={busy === giftFor.code} className="btn btn-primary mt-5 w-full">
                  {busy === giftFor.code ? "Sending…" : "Send it — I won't redeem it"}
                </button>
              </>
            )}
            <button onClick={closeSheet} className="btn btn-ghost mt-2 w-full">
              {sentTo ? "Done" : "Keep it"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Badge({ status, expired, wasGifted }: { status: string; expired: boolean; wasGifted: boolean }) {
  const [text, color] = expired && status === "active"
    ? ["Expired", "var(--warn)"]
    : status === "redeemed"
      ? ["Redeemed", "var(--ink-soft)"]
      : status === "gifted"
        ? ["Sent away", "var(--gold)"]
        : wasGifted
          ? ["A gift", "var(--good)"]
          : ["Yours", "var(--good)"];

  return (
    <span className="pill shrink-0 border" style={{ borderColor: color, color }}>
      {text}
    </span>
  );
}
