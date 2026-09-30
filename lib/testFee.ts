/**
 * A discounted listing fee for exactly one account, so a real end-to-end
 * payment can be tested — order, live checkout, webhook, board — without
 * committing the full flat fee.
 *
 * Same shape as lib/reviewLogin.ts, for the same reason: this is a hole in
 * otherwise-uniform pricing, so it stays as narrow as the hole in the front
 * door there does.
 *
 *   - both env vars must be set, or every brand pays the normal flat fee.
 *     There is no default and no fallback.
 *   - it matches one address, compared after the same normalisation the
 *     real path uses. Every other account pays LISTING_FEE_PAISE.
 *   - it only ever *discounts* — see the guard in listingFeeFor.
 *
 * TAKE IT DOWN once the test payment is made: remove TEST_FEE_EMAIL and
 * TEST_FEE_PAISE from the environment and redeploy. Left in place, it's a
 * standing way for one known address to underpay forever.
 */
import { LISTING_FEE_PAISE } from "./rules";

const testFeeEmail = process.env.TEST_FEE_EMAIL?.trim().toLowerCase();
const testFeePaise = Number(process.env.TEST_FEE_PAISE);

export function listingFeeFor(email: string): number {
  if (!testFeeEmail || !Number.isFinite(testFeePaise) || testFeePaise <= 0) return LISTING_FEE_PAISE;
  if (email.trim().toLowerCase() !== testFeeEmail) return LISTING_FEE_PAISE;
  // Only ever a discount, never a markup — a misconfigured TEST_FEE_PAISE
  // above the real fee should do nothing rather than overcharge someone.
  return Math.min(testFeePaise, LISTING_FEE_PAISE);
}
