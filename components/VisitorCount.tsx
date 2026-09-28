"use client";

import { useEffect, useState } from "react";

/**
 * A floor, not a fixed width: four squares while the count is small, and a
 * fifth or sixth appears when it earns one. Six squares from day one meant
 * four leading zeros announcing how few visitors there had been.
 */
const MIN_DIGITS = 4;

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
    total === null
      ? Array(MIN_DIGITS).fill(null)
      : String(total).padStart(MIN_DIGITS, "0").split("");

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
