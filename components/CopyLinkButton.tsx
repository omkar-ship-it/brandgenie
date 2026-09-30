"use client";

import { useState } from "react";
import { IconLink } from "./icons";

/**
 * The literal point of a per-brand Brand Corner page: it's a URL a brand
 * can hand out anywhere — a bio link, a WhatsApp status, a QR code on a
 * receipt — so the one action this page needs above everything else is
 * making that URL trivial to grab.
 */
export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked by the browser; the URL is still
      // right there in the address bar, so this isn't a dead end.
    }
  }

  return (
    <button onClick={copy} className="btn btn-ghost">
      <IconLink size={14} />
      {copied ? "Copied!" : "Copy this link"}
    </button>
  );
}
