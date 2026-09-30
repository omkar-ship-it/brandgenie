"use client";

import { useState } from "react";
import { IconSparkle } from "./icons";
import type { InterestModule } from "@/lib/interest";

/**
 * The one live action on a page that otherwise does nothing yet. Brand
 * Corner and Brand Drops are concept previews — this button is what turns
 * "does anyone want this" from a guess into a number.
 */
export function InterestButton({
  module,
  slug,
  initialCount,
  initiallyIn,
}: {
  module: InterestModule;
  slug: string;
  initialCount: number;
  initiallyIn: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [registered, setRegistered] = useState(initiallyIn);
  const [busy, setBusy] = useState(false);

  async function register() {
    if (registered || busy) return;
    setBusy(true);
    const res = await fetch("/api/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module, targetSlug: slug }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setCount(typeof data.count === "number" ? data.count : count + 1);
      setRegistered(true);
    }
  }

  return (
    <button onClick={register} disabled={registered || busy} className={`btn w-full ${registered ? "btn-ghost" : "btn-primary"}`}>
      <IconSparkle size={14} />
      {registered
        ? `You're in${count > 0 ? ` · ${count} interested` : ""}`
        : busy
          ? "…"
          : `I'm interested${count > 0 ? ` · ${count} so far` : ""}`}
    </button>
  );
}
