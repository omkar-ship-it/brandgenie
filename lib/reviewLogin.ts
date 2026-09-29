import { timingSafeEqual } from "crypto";

/**
 * A fixed sign-in code for one address, so a reviewer can get in.
 *
 * Razorpay won't approve a website they can't see working, and the merchant
 * flow sits behind an emailed code that lands in an inbox we can't hand
 * over. This lets exactly one address sign in with a code we can put in a
 * support ticket.
 *
 * It is deliberately narrow, because it is a hole in the front door:
 *
 *   - both env vars must be set, or the whole path is off. There is no
 *     default and no fallback — nothing here works by accident.
 *   - it matches one address, compared after the same normalisation the
 *     real path uses. Every other account is untouched.
 *   - it never creates an account. If the address hasn't signed in before,
 *     the code does nothing — so a typo'd REVIEW_LOGIN_EMAIL can't quietly
 *     mint a new user.
 *   - it runs before the database is consulted and returns a plain verdict,
 *     so it cannot alter how a real code is checked.
 *
 * TAKE IT DOWN once the review is approved: remove REVIEW_LOGIN_CODE from
 * the environment and redeploy. A six-digit code that never expires is a
 * different thing from a six-digit code that dies in ten minutes — left up
 * indefinitely, it is brute-forceable at leisure.
 */
const reviewEmail = process.env.REVIEW_LOGIN_EMAIL?.trim().toLowerCase();
const reviewCode = process.env.REVIEW_LOGIN_CODE?.trim();

export const reviewLoginEnabled = Boolean(reviewEmail && reviewCode);

export function isReviewLogin(email: string, code: string): boolean {
  if (!reviewEmail || !reviewCode) return false;
  if (email !== reviewEmail) return false;

  const a = Buffer.from(reviewCode, "utf8");
  const b = Buffer.from(code, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
