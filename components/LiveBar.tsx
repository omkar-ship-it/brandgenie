"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconPlay } from "./icons";

const DIGITS = 6;

/** Visitors so far, as an odometer. */
export function LiveBar() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/visit", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setTotal(d.total ?? 0))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Blanks until the count arrives, so the number never jumps from a
  // placeholder to the truth in front of someone.
  const digits = total === null ? Array(DIGITS).fill(null) : String(total).padStart(DIGITS, "0").slice(-DIGITS).split("");

  return (
    <div className="livebar mb-6">
      <div className="odo" aria-label={total === null ? "Counting visitors" : `${total} visitors so far`}>
        {digits.map((d, i) => (
          <span key={i} className="odo-digit" aria-hidden="true">
            {d ?? " "}
          </span>
        ))}
        <span className="odo-label">visitors</span>
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
