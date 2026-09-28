"use client";

import { useEffect, useState } from "react";

const DIGITS = 6;

/** Visitors so far, as an odometer. Sits in the nav beside the links. */
export function VisitorCount() {
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

  // Blank until the count arrives, so the number never jumps from a
  // placeholder to the truth in front of someone.
  const digits =
    total === null ? Array(DIGITS).fill(null) : String(total).padStart(DIGITS, "0").slice(-DIGITS).split("");

  return (
    <span className="odo" aria-label={total === null ? "Counting visitors" : `${total} visitors so far`}>
      {digits.map((d, i) => (
        <span key={i} className="odo-digit" aria-hidden="true">
          {d ?? " "}
        </span>
      ))}
      <span className="odo-label">visitors</span>
    </span>
  );
}
