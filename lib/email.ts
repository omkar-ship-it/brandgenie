type SendResult = { ok: true } | { ok: false; error: string };

/**
 * MSG91 v5 template email, same integration as LetterMail. Falls back to a
 * console log whenever credentials or the template id are missing, so every
 * flow that sends email stays fully testable without real credentials.
 */
async function sendMsg91TemplateEmail(opts: {
  to: string;
  templateId: string | undefined;
  variables: Record<string, string>;
  logLabel: string;
  devFallbackMessage: string;
}): Promise<SendResult> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const domain = process.env.MSG91_EMAIL_DOMAIN;
  const fromEmail = process.env.MSG91_FROM_EMAIL;

  if (!authKey || !domain || !opts.templateId || !fromEmail) {
    console.log(`[${opts.logLabel}] MSG91 not configured — ${opts.devFallbackMessage}`);
    return { ok: true };
  }

  try {
    const res = await fetch("https://control.msg91.com/api/v5/email/send", {
      method: "POST",
      headers: { authkey: authKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        recipients: [{ to: [{ email: opts.to }], variables: opts.variables }],
        from: { email: fromEmail, name: process.env.MSG91_FROM_NAME || "LoyalGenie" },
        domain,
        template_id: opts.templateId,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[${opts.logLabel}] MSG91 send failed`, res.status, body);
      return { ok: false, error: "Couldn't send the email — try again?" };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[${opts.logLabel}] MSG91 send threw`, err);
    return { ok: false, error: "Couldn't send the email — try again?" };
  }
}

/**
 * NOTE: MSG91 merge-tag names are exactly whatever text was typed into that
 * template's editor, and a mismatch is silent — MSG91 returns 2xx and the
 * email arrives with a blank where the value should be. The `brandgenie`
 * template uses {{OTP}} (LetterMail's uses {{OTP_CODE}}, hence the trap).
 * Check the live template before changing this.
 */
export async function sendOtpEmail(to: string, code: string): Promise<SendResult> {
  return sendMsg91TemplateEmail({
    to,
    templateId: process.env.MSG91_EMAIL_TEMPLATE_ID,
    variables: { OTP: code },
    logLabel: "otp",
    devFallbackMessage: `login code for ${to} is ${code}`,
  });
}

export async function sendGiftEmail(to: string, opts: { from: string; label: string; url: string }) {
  return sendMsg91TemplateEmail({
    to,
    templateId: process.env.MSG91_GIFT_TEMPLATE_ID,
    variables: { sender_name: opts.from, reward: opts.label, claim_link: opts.url },
    logLabel: "gift",
    devFallbackMessage: `${opts.from} sent "${opts.label}" to ${to} — claim at ${opts.url}`,
  });
}
