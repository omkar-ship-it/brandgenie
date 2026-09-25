"use client";

import { useState } from "react";
import { BID_STEP_PAISE, CATEGORIES, CATEGORY_ICON, rupees } from "@/lib/rules";

export type BrandDraft = {
  name: string;
  category: string;
  tagline: string;
  area: string;
  website: string;
  instagram: string;
  rewardLabel: string;
  rewardIcon: string;
  totalStock: number;
  validDays: number;
};

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function BrandConsole({
  draft,
  hasBrand,
  currentBidPaise,
  position,
  suggestedPaise,
  minPaise,
}: {
  draft: BrandDraft;
  hasBrand: boolean;
  currentBidPaise: number;
  position: number | null;
  suggestedPaise: number;
  minPaise: number;
}) {
  const [form, setForm] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(hasBrand);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [amount, setAmount] = useState(String(Math.round(suggestedPaise / 100)));
  const [paying, setPaying] = useState(false);

  const set = <K extends keyof BrandDraft>(key: K, value: BrandDraft[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    setSaving(true);
    setError("");
    setNotice("");
    const res = await fetch("/api/brand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(data.error ?? "Couldn't save that.");
    setSaved(true);
    setNotice("Listing saved.");
  }

  async function bid() {
    const paise = Math.round(Number(amount) * 100);
    setError("");
    setNotice("");
    if (!Number.isFinite(paise) || paise < minPaise || paise % BID_STEP_PAISE !== 0) {
      return setError(`Bid at least ${rupees(minPaise)}, in steps of ${rupees(BID_STEP_PAISE)}.`);
    }

    setPaying(true);
    const res = await fetch("/api/bids/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountPaise: paise }),
    });
    const order = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPaying(false);
      return setError(order.error ?? "Couldn't start the payment.");
    }

    const confirm = async (payload: Partial<RazorpayResponse>) => {
      const v = await fetch("/api/bids/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidId: order.bidId,
          orderId: order.orderId,
          paymentId: payload.razorpay_payment_id,
          signature: payload.razorpay_signature,
        }),
      });
      const data = await v.json().catch(() => ({}));
      setPaying(false);
      if (!v.ok) return setError(data.error ?? "We couldn't confirm that payment.");
      window.location.reload();
    };

    // Test mode has no gateway to open — the bid is confirmed straight away so
    // the whole flow stays demoable without live keys.
    if (order.mock) return confirm({});

    const ok = await loadCheckout();
    if (!ok) {
      setPaying(false);
      return setError("Couldn't reach Razorpay. Check your connection and try again.");
    }

    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amountPaise,
      currency: "INR",
      name: "BrandGenie",
      description: `Board bid — ${order.brandName}`,
      prefill: { email: order.email },
      theme: { color: "#6d3bef" },
      handler: (response: RazorpayResponse) => void confirm(response),
      modal: { ondismiss: () => setPaying(false) },
    });
    rzp.open();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
      {/* ------------------------------------------------- listing */}
      <section className="card p-6">
        <h2 className="text-[17px] font-semibold">Your listing</h2>
        <p className="mt-1 text-[13px] text-ink-soft">This is what a customer sees when they tap your tile.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Brand name" className="sm:col-span-2">
            <input
              className="input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Third Wave Coffee"
            />
          </Field>

          <Field label="Category" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("category", c)}
                  className={`pill border ${
                    form.category === c ? "border-brand bg-brand text-white" : "border-line bg-bg text-ink-soft"
                  }`}
                >
                  {CATEGORY_ICON[c]} {c}
                </button>
              ))}
            </div>
          </Field>

          <Field label="One line about you" className="sm:col-span-2">
            <input
              className="input"
              value={form.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="Single-origin pour-overs, roasted weekly"
            />
          </Field>

          <Field label="Area">
            <input
              className="input"
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
              placeholder="Indiranagar, Bengaluru"
            />
          </Field>
          <Field label="Website">
            <input
              className="input"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="Instagram" className="sm:col-span-2">
            <input
              className="input"
              value={form.instagram}
              onChange={(e) => set("instagram", e.target.value)}
              placeholder="https://instagram.com/…"
            />
          </Field>
        </div>

        <h3 className="mt-7 text-[15px] font-semibold">What you&rsquo;re giving away</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-[64px_1fr]">
          <Field label="Icon">
            <input
              className="input text-center text-[18px]"
              value={form.rewardIcon}
              onChange={(e) => set("rewardIcon", e.target.value)}
              maxLength={4}
            />
          </Field>
          <Field label="Reward">
            <input
              className="input"
              value={form.rewardLabel}
              onChange={(e) => set("rewardLabel", e.target.value)}
              placeholder="Free cappuccino"
            />
          </Field>
          <Field label="How many">
            <input
              className="input"
              type="number"
              min={1}
              max={500}
              value={form.totalStock}
              onChange={(e) => set("totalStock", Number(e.target.value))}
            />
          </Field>
          <Field label="Valid for (days after winning)">
            <input
              className="input"
              type="number"
              min={1}
              max={365}
              value={form.validDays}
              onChange={(e) => set("validDays", Number(e.target.value))}
            />
          </Field>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button onClick={save} disabled={saving} className="btn btn-primary">
            {saving ? "Saving…" : hasBrand ? "Save changes" : "Save listing"}
          </button>
          {notice && <span className="text-[12.5px] font-semibold text-good">{notice}</span>}
          {error && <span className="text-[12.5px] font-semibold text-warn">{error}</span>}
        </div>
      </section>

      {/* ------------------------------------------------- bid */}
      <section className="card p-6">
        <h2 className="text-[17px] font-semibold">Your place on the board</h2>

        <div className="mt-4 rounded-xl bg-sunk p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[12.5px] text-ink-soft">Current position</span>
            <span className="mono text-[22px] font-semibold">{position ? `#${position}` : "—"}</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[12.5px] text-ink-soft">Live bid</span>
            <span className="mono text-[15px] font-semibold">{rupees(currentBidPaise)}</span>
          </div>
        </div>

        <p className="mt-4 text-[13px] text-ink-soft">
          Higher bid, higher up the board — position #1 is whoever paid the most. Ties go to whoever bid first. A bid
          buys visibility only; the genie&rsquo;s walk is the same for every brand.
        </p>

        <label className="label mt-5">Your bid (₹)</label>
        <div className="flex gap-2">
          <input
            className="input mono"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
          />
          <button onClick={bid} disabled={paying || !saved} className="btn btn-primary shrink-0">
            {paying ? "Processing…" : "Pay & take place"}
          </button>
        </div>
        <p className="mono mt-2 text-[11.5px] text-ink-soft">
          Minimum {rupees(minPaise)} · steps of {rupees(BID_STEP_PAISE)}
        </p>
        {!saved && <p className="mt-2 text-[12.5px] text-warn">Save your listing before bidding.</p>}
      </section>
    </div>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
