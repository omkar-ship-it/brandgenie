"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Role = "customer" | "merchant";

const ROLES: { value: Role; icon: string; title: string; blurb: string; home: string }[] = [
  {
    value: "customer",
    icon: "🎁",
    title: "Play & win",
    blurb: "One round a day, rewards from the brands on the board.",
    home: "/",
  },
  {
    value: "merchant",
    icon: "🏪",
    title: "List my brand",
    blurb: "Take a place on the board and give a reward away.",
    home: "/brand",
  },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  // A brand arriving via "For brands" shouldn't have to say so twice.
  const [role, setRole] = useState<Role>(params.get("as") === "merchant" ? "merchant" : "customer");

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong.");
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, role }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong.");

    // The server has the last word on role — an existing merchant signing in
    // on the customer side still lands in their console.
    const home = ROLES.find((r) => r.value === data.role)?.home ?? "/";
    router.push(next || home);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-[440px] px-5 py-16">
      <h1 className="text-[26px] font-semibold">
        {step === "email" ? "Sign in" : "Check your email"}
      </h1>
      <p className="mt-2 mb-7 text-[14px] text-ink-soft">
        {step === "email"
          ? "One email, one code. Tell us which side you're on."
          : `We sent a 6-digit code to ${email}.`}
      </p>

      {step === "email" ? (
        <form onSubmit={requestCode} className="card p-5">
          <span className="label">I&rsquo;m here to</span>
          <div className="mb-5 grid gap-2 sm:grid-cols-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                aria-pressed={role === r.value}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  role === r.value ? "border-brand bg-sunk" : "border-line bg-bg hover:border-brand"
                }`}
              >
                <span className="text-[20px]">{r.icon}</span>
                <span className="mt-1 block text-[13.5px] font-semibold">{r.title}</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">{r.blurb}</span>
              </button>
            ))}
          </div>

          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          {error && <p className="mt-2 text-[12px] font-semibold text-warn">{error}</p>}
          <button className="btn btn-primary mt-4 w-full" disabled={busy}>
            {busy ? "Sending…" : "Email me a code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="card p-5">
          <label className="label" htmlFor="code">
            6-digit code
          </label>
          <input
            id="code"
            className="input mono text-center text-[20px] tracking-[0.3em]"
            inputMode="numeric"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
          />
          {error && <p className="mt-2 text-[12px] font-semibold text-warn">{error}</p>}
          <button className="btn btn-primary mt-4 w-full" disabled={busy}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
            }}
            className="mt-2 w-full text-[12px] text-ink-soft underline"
          >
            Use a different email
          </button>
        </form>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[440px] px-5 py-16 text-ink-soft">Loading…</main>}>
      <LoginForm />
    </Suspense>
  );
}
