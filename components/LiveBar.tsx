"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconPlay } from "./icons";

/** Counts up to a number rather than snapping to it. */
function useCountUp(target: number, ms = 900) {
  const [n, setN] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    // Reduced motion lands on the number in a single frame rather than
    // skipping the loop — setting state synchronously inside an effect
    // triggers a cascading render.
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      // ease-out: fast first, settles on the number rather than slamming into it
      setN(Math.round(a + (target - a) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return n;
}

/**
 * The strip across the top of the board: who's here, and the one-minute way
 * in for anyone who doesn't yet know what this is.
 *
 * The counts come back from recording the visit, so the number a visitor
 * sees already includes them — arriving and watching the figure tick up by
 * one is the point.
 */
export function LiveBar({ brands, rewards }: { brands: number; rewards: number }) {
  const [visitors, setVisitors] = useState<{ today: number; total: number } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/visit", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setVisitors({ today: d.today ?? 0, total: d.total ?? 0 }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const today = useCountUp(visitors?.today ?? 0);
  const total = useCountUp(visitors?.total ?? 0);
  const brandCount = useCountUp(brands);
  const rewardCount = useCountUp(rewards);

  return (
    <div className="livebar mb-6">
      <div className="livebar-stats">
        <Stat value={today} label="here today" live />
        <Stat value={total} label="have visited" />
        <Stat value={brandCount} label={brandCount === 1 ? "brand on the board" : "brands on the board"} />
        <Stat value={rewardCount} label="rewards waiting" />
      </div>

      <Link href="/try" className="livebar-cta">
        <span className="livebar-shine" aria-hidden="true" />
        <IconPlay size={15} />
        <span>
          See how it works
          <span className="livebar-cta-sub">one minute, no sign-in</span>
        </span>
      </Link>
    </div>
  );
}

function Stat({ value, label, live }: { value: number; label: string; live?: boolean }) {
  return (
    <span className="livebar-stat">
      <span className="livebar-num">
        {live && <span className="livedot" aria-hidden="true" />}
        {value.toLocaleString("en-IN")}
      </span>
      <span className="livebar-label">{label}</span>
    </span>
  );
}
