"use client";

import { useEffect, useState } from "react";
import { CATEGORY_ACCENT, REDEEM_WINDOW_SECONDS } from "@/lib/rules";

export type RewardCard = {
  code: string;
  brandName: string;
  label: string;
  icon: string;
  status: string;
  category: string;
  expiresAt: string;
  redeemedAt: string | null;
  giftedToEmail: string | null;
  wasGifted: boolean;
};

type Counter = { code: string; label: string; brandName: string; endsAt: number };

/** Anything redeemed in the last 30s is still live at the counter. */
function openCounter(rewards: RewardCard[]): Counter | null {
  for (const r of rewards) {
    if (r.status !== "redeemed" || !r.redeemedAt) continue;
    const endsAt = new Date(r.redeemedAt).getTime() + REDEEM_WINDOW_SECONDS * 1000;
    if (endsAt > Date.now()) {
      return { code: r.code, label: r.label, brandName: r.brandName, endsAt };
    }
  }
  return null;
}

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
  const [confirming, setConfirming] = useState<RewardCard | null>(null);
  // Seeded from the server so a refresh mid-window resumes the countdown
  // rather than losing it.
  const [counter, setCounter] = useState<Counter | null>(() => openCounter(rewards));
  const [left, setLeft] = useState(REDEEM_WINDOW_SECONDS);

  useEffect(() => {
    if (!counter) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((counter.endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [counter]);

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
    setConfirming(null);
    if (!res.ok) return setError(data.error ?? "Couldn't redeem that.");
    setCounter({
      code: data.code,
      label: data.label,
      brandName: data.brandName,
      endsAt: new Date(data.redeemedAt).getTime() + (data.windowSeconds ?? REDEEM_WINDOW_SECONDS) * 1000,
    });
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
                    <button onClick={() => setConfirming(r)} className="btn btn-primary">
                      Redeem
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

      {/* --------------------------------- confirm before burning it */}
      {confirming && (
        <div
          className="backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Redeem at the counter"
          onClick={(e) => e.target === e.currentTarget && setConfirming(null)}
        >
          <div className="sheet p-6 text-center">
            <div className="text-[30px]">{confirming.icon}</div>
            <h2 className="mt-2 text-[19px] font-semibold">Are you at the counter?</h2>
            <p className="mx-auto mt-1 max-w-[34ch] text-[13.5px] text-ink-soft">
              Your code shows for {REDEEM_WINDOW_SECONDS} seconds for staff to check, and{" "}
              <strong>{confirming.label}</strong> is spent the moment you tap. Don&rsquo;t do this early.
            </p>
            <button
              onClick={() => redeem(confirming.code)}
              disabled={busy === confirming.code}
              className="btn btn-primary mt-5 w-full"
            >
              {busy === confirming.code ? "…" : `Show the code — ${REDEEM_WINDOW_SECONDS}s`}
            </button>
            <button onClick={() => setConfirming(null)} className="btn btn-ghost mt-2 w-full">
              Not yet
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------- the counter screen */}
      {counter && (
        <div className="backdrop" role="dialog" aria-modal="true" aria-label="Show this at the counter">
          <div className="sheet counter-sheet p-7 text-center">
            {left > 0 ? (
              <>
                <div className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">
                  Show this at the counter
                </div>
                <div className="counter-code mono mt-3">{counter.code}</div>
                <div className="mt-2 text-[15px] font-semibold">{counter.label}</div>
                <div className="text-[12.5px] text-ink-soft">{counter.brandName}</div>

                {/* The number and the draining ring both move, so staff can
                    see at a glance that this is live and not a screenshot. */}
                <div className="counter-ring mt-6" style={{ "--pct": `${(left / REDEEM_WINDOW_SECONDS) * 100}%` } as React.CSSProperties}>
                  <span className="mono">{left}</span>
                </div>
                <p className="mt-3 text-[12px] text-ink-soft">
                  seconds left · redeemed{" "}
                  {new Date(counter.endsAt - REDEEM_WINDOW_SECONDS * 1000).toLocaleTimeString("en-IN", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </>
            ) : (
              <>
                <div className="text-[34px]">✅</div>
                <h2 className="mt-2 text-[19px] font-semibold">Redeemed</h2>
                <p className="mt-1 text-[13.5px] text-ink-soft">
                  <strong>{counter.label}</strong> is done. The code{" "}
                  <span className="mono">{counter.code}</span> won&rsquo;t work again.
                </p>
                <button onClick={() => window.location.reload()} className="btn btn-primary mt-5 w-full">
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
