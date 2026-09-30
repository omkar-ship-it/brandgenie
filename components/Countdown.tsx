"use client";

import { useEffect, useState } from "react";

function format(ms: number) {
  if (ms <= 0) return "Unlocking…";
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return days > 0 ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Ticks down from `msUntil`, seeded from the server so the first paint
 * matches — the same pattern as the 11:11 wish countdown in WishWindow.tsx.
 * Never calls Date.now() during render itself, only inside the effect,
 * which is what keeps server and client agreeing on the first frame.
 */
export function Countdown({ msUntil }: { msUntil: number }) {
  const [remaining, setRemaining] = useState(msUntil);

  useEffect(() => {
    const deadline = Date.now() + msUntil;
    const id = setInterval(() => setRemaining(Math.max(0, deadline - Date.now())), 1000);
    return () => clearInterval(id);
  }, [msUntil]);

  return <span className="mono countdown-chip">{format(remaining)}</span>;
}
