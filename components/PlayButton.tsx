"use client";

import { useState } from "react";
import Link from "next/link";
import { IconPlay } from "./icons";
import type { InterestModule } from "@/lib/interest";

/**
 * The Brand Corner call to action. There's no real game behind it yet, so
 * this can't actually start one — what it can honestly do is register that
 * a visitor wanted to, and either carry them to that brand's own preview
 * page (from the grid, where `href` is set) or confirm it right where they
 * are (on that page itself, where it isn't). Either way it's one click, not
 * a game followed by a separate survey question about the game.
 */
export function PlayButton({
  module,
  slug,
  href,
  initialCount,
  initiallyIn,
}: {
  module: InterestModule;
  slug: string;
  /** Present on the grid: navigates on click instead of confirming in place. */
  href?: string;
  initialCount: number;
  initiallyIn: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [played, setPlayed] = useState(initiallyIn);
  const [busy, setBusy] = useState(false);

  async function registerInterest() {
    if (played) return;
    if (href) {
      // Already navigating — a slow or failed count must never hold that
      // up, so this doesn't wait on the response at all.
      void fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, targetSlug: slug }),
      }).catch(() => {});
      return;
    }
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
      setPlayed(true);
    }
  }

  if (href) {
    return (
      <Link href={href} onClick={registerInterest} className="btn btn-primary w-full">
        <IconPlay size={14} /> Play
        {count > 0 && <span className="mono opacity-75"> · {count}</span>}
      </Link>
    );
  }

  return (
    <button onClick={registerInterest} disabled={played || busy} className={`btn w-full ${played ? "btn-ghost" : "btn-primary"}`}>
      <IconPlay size={14} />
      {played ? `You're on the list${count > 0 ? ` · ${count}` : ""}` : busy ? "…" : "Play"}
    </button>
  );
}
