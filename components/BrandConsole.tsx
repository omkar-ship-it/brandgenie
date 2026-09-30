"use client";

import { useState } from "react";
import { CATEGORIES, CATEGORY_ICON, LISTING_FEE_PAISE, rupees } from "@/lib/rules";
import { TilePreview } from "./TilePreview";
import { IconCart, IconCounter, IconTrendUp } from "./icons";

export type BrandDraft = {
  name: string;
  category: string;
  tagline: string;
  area: string;
  website: string;
  instagram: string;
  rewardLabel: string;
  rewardIcon: string;
  redemptionType: string;
  instructions: string;
  redeemUrl: string;
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

const LOGO_MAX_PX = 512;

/**
 * Real logo files are routinely several megabytes, and the server caps
 * uploads at 2MB — so rather than rejecting what people actually have,
 * redraw it to 512px first. Tiles are ~40px, so nothing is lost, and the
 * board gets lighter images for free.
 *
 * SVG passes through untouched: it's already tiny and rasterising it would
 * throw away the only reason to use it.
 */
async function shrinkForUpload(file: File): Promise<File> {
  if (file.type === "image/svg+xml") return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, LOGO_MAX_PX / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return file;
  return new File([blob], "logo.png", { type: "image/png" });
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
  logoUrl: initialLogo,
  canUploadLogo,
  coupons: initialCoupons,
  listed,
  position,
  voteCount,
  clicks,
}: {
  draft: BrandDraft;
  hasBrand: boolean;
  logoUrl: string | null;
  canUploadLogo: boolean;
  coupons: { total: number; unused: number };
  /** Whether the flat listing fee has been paid. */
  listed: boolean;
  position: number | null;
  voteCount: number;
  clicks: number;
}) {
  const [form, setForm] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(hasBrand);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [paying, setPaying] = useState(false);
  const [logoUrl, setLogoUrl] = useState(initialLogo);
  const [logoBusy, setLogoBusy] = useState(false);
  // Upload problems belong beside the logo, not in the save row far below
  // where nobody looks — that made a rejected file read as "nothing happened".
  const [logoError, setLogoError] = useState("");
  const [coupons, setCoupons] = useState(initialCoupons);
  const [codeText, setCodeText] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const online = form.redemptionType === "online";

  async function uploadCodes() {
    setCodeBusy(true);
    setError("");
    const res = await fetch("/api/brand/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codes: codeText }),
    });
    const data = await res.json().catch(() => ({}));
    setCodeBusy(false);
    if (!res.ok) return setError(data.error ?? "Couldn't add those codes.");
    setCoupons({ total: data.total, unused: data.unused });
    setCodeText("");
    setNotice(`${data.unused} codes ready to give away.`);
  }

  async function clearCodes() {
    setCodeBusy(true);
    const res = await fetch("/api/brand/coupons", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setCodeBusy(false);
    if (res.ok) setCoupons({ total: data.total, unused: data.unused });
  }

  async function uploadLogo(file: File) {
    setLogoBusy(true);
    setLogoError("");
    try {
      const prepared = await shrinkForUpload(file);
      const body = new FormData();
      body.append("file", prepared);
      const res = await fetch("/api/brand/logo", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setLogoError(data.error ?? "Couldn't upload that.");
      setLogoUrl(data.logoUrl);
    } catch {
      setLogoError("Couldn't read that image. Try a PNG or JPG.");
    } finally {
      setLogoBusy(false);
    }
  }

  async function removeLogo() {
    setLogoBusy(true);
    setLogoError("");
    await fetch("/api/brand/logo", { method: "DELETE" });
    setLogoBusy(false);
    setLogoUrl(null);
  }

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

  /**
   * Pay the flat listing fee, once. There's no amount to choose any more —
   * the client sends nothing but the request itself, and the server decides
   * the price. Position afterwards comes from customer votes, not a second
   * payment.
   */
  async function payListingFee() {
    setError("");
    setNotice("");
    setPaying(true);
    const res = await fetch("/api/bids/create-order", { method: "POST" });
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

    // Test mode has no gateway to open — the fee is confirmed straight away
    // so the whole flow stays demoable without live keys.
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
      name: "LoyalGenie",
      description: `Board listing — ${order.brandName}`,
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
        <p className="mt-1 text-[13px] text-ink-soft">
          This is what a customer sees when they tap your tile. Keep it about the brand, not a branch.
        </p>

        {/* Logo first — it's the thing a brand recognises itself by on the
            board, and uploading it before anything else makes the tile
            preview meaningful straight away. */}
        <div className="mt-5 flex items-center gap-4 rounded-xl bg-sunk p-4">
          <div className="logo-slot">
            {logoUrl ? (
              /* Plain img: blob URLs are arbitrary hosts and next/image would
                 need each allowlisted in next.config for no real gain here. */
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" />
            ) : (
              <span className="text-[11px] font-semibold text-ink-soft">No logo</span>
            )}
          </div>
          <div className="min-w-[180px] flex-1">
            <span className="label">Logo</span>
            {canUploadLogo ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {/* A disabled label still looks like a button, so the
                      not-yet-saved state gets its own dead-looking control
                      rather than one that silently swallows clicks. */}
                  {saved ? (
                    <label className={`btn btn-ghost cursor-pointer ${logoBusy ? "opacity-60" : ""}`}>
                      {logoBusy ? "Uploading…" : logoUrl ? "Replace" : "Upload a logo"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        disabled={logoBusy}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadLogo(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  ) : (
                    <button type="button" disabled className="btn btn-ghost">
                      Upload a logo
                    </button>
                  )}
                  {logoUrl && (
                    <button type="button" onClick={removeLogo} disabled={logoBusy} className="btn btn-ghost">
                      Remove
                    </button>
                  )}
                </div>
                {logoError ? (
                  <p className="mt-1.5 text-[11.5px] font-semibold text-warn">{logoError}</p>
                ) : (
                  <p className="mt-1.5 text-[11.5px] text-ink-soft">
                    {saved
                      ? "PNG, JPG, WebP or SVG. Big files are resized for you."
                      : "Save your listing first, then add a logo."}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[11.5px] text-ink-soft">
                Logo uploads need blob storage configured. Your initials show on the tile until then.
              </p>
            )}
          </div>
        </div>

        <h3 className="section-head mt-8">
          <span>Who you are</span>
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Brand name" className="sm:col-span-2">
            <input
              className="input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Kalaa Studio"
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
              placeholder="Handmade ceramics, thrown to order"
            />
          </Field>

          <Field label="Where you reach people">
            <input
              className="input"
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
              placeholder="Online · pan-India"
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

        <h3 className="section-head mt-8">
          <span>What you&rsquo;re giving away</span>
        </h3>

        {/* The type decides everything downstream, so it's asked first. */}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            {
              value: "counter",
              icon: <IconCounter size={19} />,
              title: "At your counter",
              blurb: "Staff see a live code with a 30-second timer. Nothing to set up.",
            },
            {
              value: "online",
              icon: <IconCart size={19} />,
              title: "On your website",
              blurb: "We hand out one of your own discount codes per win.",
            },
          ].map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set("redemptionType", t.value)}
              aria-pressed={form.redemptionType === t.value}
              className={`rounded-xl border p-3 text-left transition-colors ${
                form.redemptionType === t.value ? "border-brand bg-sunk" : "border-line bg-bg hover:border-brand"
              }`}
            >
              <span className="text-ink-soft">{t.icon}</span>
              <span className="mt-1 block text-[13.5px] font-semibold">{t.title}</span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">{t.blurb}</span>
            </button>
          ))}
        </div>
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
              placeholder="A free starter piece"
            />
          </Field>
          {/* The caption goes in the label, not inside the box — this column
              is narrow and two items in the field collided. */}
          <Field label={online ? "How many (your codes)" : "How many"}>
            {online ? (
              <div className="input mono text-ink-soft">{coupons.unused}</div>
            ) : (
              <input
                className="input"
                type="number"
                min={1}
                max={500}
                value={form.totalStock}
                onChange={(e) => set("totalStock", Number(e.target.value))}
              />
            )}
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

        <div className="mt-4 grid gap-4">
          <Field label={online ? "Where do they use it?" : "What should staff do?"}>
            <input
              className="input"
              maxLength={220}
              value={form.instructions}
              onChange={(e) => set("instructions", e.target.value)}
              placeholder={
                online
                  ? "Paste at checkout. One per customer, not with other offers."
                  : "Show this screen at the counter before paying."
              }
            />
          </Field>

          {online && (
            <Field label="Link to use it (optional)">
              <input
                className="input"
                value={form.redeemUrl}
                onChange={(e) => set("redeemUrl", e.target.value)}
                placeholder="https://yourshop.example/cart"
              />
            </Field>
          )}
        </div>

        {online && (
          <div className="mt-5 rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-[13.5px] font-semibold">Your discount codes</h4>
              <span className="mono text-[11.5px] text-ink-soft">
                {coupons.unused} unused · {coupons.total} total
              </span>
            </div>
            <p className="mt-1 text-[12px] text-ink-soft">
              Single-use codes from your own store, one per line. Each winner gets one nobody else can use — that
              is what stops a code being screenshotted and passed around.
            </p>
            <textarea
              className="input mono mt-3 h-24 resize-y"
              value={codeText}
              onChange={(e) => setCodeText(e.target.value)}
              placeholder={"GENIE-4KJ2\nGENIE-9XM1\nGENIE-2PQ7"}
              disabled={!saved}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={uploadCodes}
                disabled={codeBusy || !saved || codeText.trim().length === 0}
                className="btn btn-primary"
              >
                {codeBusy ? "Adding…" : "Add codes"}
              </button>
              {coupons.unused > 0 && (
                <button type="button" onClick={clearCodes} disabled={codeBusy} className="btn btn-ghost">
                  Clear unused
                </button>
              )}
            </div>
            {!saved && <p className="mt-2 text-[12px] text-warn">Save your listing first.</p>}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button onClick={save} disabled={saving} className="btn btn-primary">
            {saving ? "Saving…" : hasBrand ? "Save changes" : "Save listing"}
          </button>
          {notice && <span className="text-[12.5px] font-semibold text-good">{notice}</span>}
          {error && <span className="text-[12.5px] font-semibold text-warn">{error}</span>}
        </div>
      </section>

      {/* ------------------------------------------------- preview + bid */}
      <div className="grid gap-5">
        <section className="card p-6">
          <TilePreview
            name={form.name}
            category={form.category}
            rewardLabel={form.rewardLabel}
            rewardIcon={form.rewardIcon}
            logoUrl={logoUrl}
            remaining={online ? coupons.unused : form.totalStock}
            voteCount={voteCount}
            position={position}
            clicks={clicks}
          />
        </section>

      <section className="card p-6">
        <h2 className="text-[17px] font-semibold">Your place on the board</h2>

        <div className="mt-4 rounded-xl bg-sunk p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[12.5px] text-ink-soft">Current position</span>
            <span className="mono text-[22px] font-semibold">{position ? `#${position}` : "—"}</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[12.5px] text-ink-soft">Customer votes</span>
            <span className="mono flex items-center gap-1.5 text-[15px] font-semibold">
              <IconTrendUp size={14} /> {voteCount}
            </span>
          </div>
        </div>

        {listed ? (
          <p className="mt-4 text-[13px] text-ink-soft">
            More votes than the brand above you moves you up; fewer than the brand below moves you down. Listing
            is a flat fee — position isn&rsquo;t for sale after that, and the genie&rsquo;s walk is the same for
            every brand.
          </p>
        ) : (
          <>
            <p className="mt-4 text-[13px] text-ink-soft">
              A one-time, flat fee — the same for every brand. Once you&rsquo;re listed, customers vote you up the
              board; there&rsquo;s nothing further to pay.
            </p>
            <button
              onClick={payListingFee}
              disabled={paying || !saved}
              className="btn btn-primary mt-5 w-full"
            >
              {paying ? "Processing…" : `List for ${rupees(LISTING_FEE_PAISE)}`}
            </button>
            {!saved && <p className="mt-2 text-[12.5px] text-warn">Save your listing before paying.</p>}
          </>
        )}
      </section>
      </div>
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
