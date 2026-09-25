"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClaimButton({ code }: { code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function claim() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/rewards/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(data.error ?? "Couldn't claim that.");
    }
    router.push("/rewards");
  }

  return (
    <>
      <button onClick={claim} disabled={busy} className="btn btn-primary w-full">
        {busy ? "Claiming…" : "Claim it"}
      </button>
      {error && <p className="mt-2 text-[12.5px] font-semibold text-warn">{error}</p>}
    </>
  );
}
