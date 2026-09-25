"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, CATEGORY_ICON, WISHES_PER_DAY } from "@/lib/rules";

export type MyWish = { id: string; text: string; category: string; at: string };

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function WishWindow({
  open: openOnServer,
  msUntil,
  used,
  mine,
}: {
  open: boolean;
  msUntil: number;
  used: number;
  mine: MyWish[];
}) {
  const router = useRouter();
  // Seeded from the server so the first paint matches, then ticked locally.
  const [remaining, setRemaining] = useState(msUntil);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (openOnServer) return;
    const deadline = Date.now() + msUntil;
    const id = setInterval(() => {
      const left = deadline - Date.now();
      setRemaining(Math.max(0, left));
      // The window just opened — let the server re-render the gate.
      if (left <= 0) router.refresh();
    }, 1000);
    return () => clearInterval(id);
  }, [msUntil, openOnServer, router]);

  const open = openOnServer || remaining <= 0;
  const left = WISHES_PER_DAY - used;

  async function send() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/wishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, category }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Couldn't send that wish.");
    setText("");
    router.refresh();
  }

  return (
    <>
      {/* --------------------------------- the window */}
      <div className={`card p-6 text-center ${open ? "" : "opacity-95"}`}>
        {open ? (
          <>
            <div className="text-[34px]">🌟</div>
            <h2 className="mt-2 text-[19px] font-semibold">It&rsquo;s 11:11 — make your wish</h2>
            <p className="mt-1 text-[13px] text-ink-soft">
              {left > 0 ? `${left} of ${WISHES_PER_DAY} left today.` : "That's both your wishes for today."}
            </p>
          </>
        ) : (
          <>
            <div className="text-[34px]">🕚</div>
            <h2 className="mt-2 text-[19px] font-semibold">The window opens in</h2>
            <div className="mono mt-2 text-[40px] leading-none font-semibold tracking-tight">{clock(remaining)}</div>
            <p className="mt-2 text-[13px] text-ink-soft">
              Wishes are only taken at 11:11 — morning and night, IST. Two a day, no more.
            </p>
          </>
        )}

        {open && left > 0 && (
          <div className="mx-auto mt-6 max-w-[440px] text-left">
            <label className="label">What are you wishing for?</label>
            <input
              className="input"
              value={text}
              maxLength={160}
              autoFocus
              onChange={(e) => setText(e.target.value)}
              placeholder="A proper filter coffee on the way to work"
              onKeyDown={(e) => e.key === "Enter" && !busy && send()}
            />

            <label className="label mt-4">Kind of wish</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`pill border ${
                    category === c ? "border-brand bg-brand text-white" : "border-line bg-bg text-ink-soft"
                  }`}
                >
                  {CATEGORY_ICON[c]} {c}
                </button>
              ))}
            </div>

            {error && <p className="mt-3 text-[12.5px] font-semibold text-warn">{error}</p>}

            <button onClick={send} disabled={busy || text.trim().length < 4} className="btn btn-primary mt-5 w-full">
              {busy ? "Sending…" : "Make the wish"}
            </button>
          </div>
        )}
      </div>

      {/* --------------------------------- today's wishes */}
      {mine.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-3 text-[12px] font-semibold tracking-wide text-ink-soft uppercase">
            Your wishes today
          </h3>
          <ul className="grid gap-3">
            {mine.map((w) => (
              <li key={w.id} className="card flex items-start gap-3 p-4">
                <span className="text-[20px] leading-none">{CATEGORY_ICON[w.category] ?? "✨"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px]">{w.text}</p>
                  <p className="mono mt-1 text-[11.5px] text-ink-soft">{w.category}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
