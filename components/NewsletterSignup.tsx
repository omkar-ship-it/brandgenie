"use client";

import { useState } from "react";
import { IconSparkle } from "./icons";

/**
 * Works the same for a signed-out visitor and a signed-in customer, which
 * is the whole point of not gating it behind an account: a signed-in
 * customer's email is prefilled from their session so there's nothing to
 * type, and a signed-out visitor gets a plain input. Either way it's one
 * field and one click — a newsletter signup that demands more than that
 * mostly just doesn't get signups.
 */
export function NewsletterSignup({
  defaultEmail,
  initialCount,
}: {
  defaultEmail?: string;
  initialCount: number;
}) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function subscribe() {
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError("Enter a real email address.");
    }
    setBusy(true);
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Couldn't subscribe that address.");
    setCount(typeof data.count === "number" ? data.count : count + 1);
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-[13.5px] font-semibold text-good">
        <IconSparkle size={16} /> You&rsquo;re on the list — deals land in {email}.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          className="input"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && subscribe()}
        />
        <button onClick={subscribe} disabled={busy} className="btn btn-primary shrink-0">
          {busy ? "…" : "Subscribe"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-[12px] font-semibold text-warn">{error}</p>}
      {!error && count > 0 && (
        <p className="mt-1.5 text-[11.5px] text-ink-soft">
          Join {count.toLocaleString("en-IN")} {count === 1 ? "other" : "others"} already on the list.
        </p>
      )}
    </div>
  );
}
