/**
 * Who is actually on the hook, in one place.
 *
 * The footer, both legal pages and the grievance contact all read from here
 * so they can never drift apart — a privacy policy naming one entity and a
 * terms page naming another is the kind of inconsistency that undoes both.
 *
 * TODO before these pages are relied on: `REGISTERED_ADDRESS`, `JURISDICTION`
 * and `GRIEVANCE_OFFICER` are placeholders. Indian law requires a named
 * grievance officer with a real address for an intermediary, and a contract
 * with no seat of jurisdiction invites an argument about where a dispute is
 * heard.
 */
export const COMPANY = {
  legalName: "Bandico Ventures",
  product: "LoyalGenie",
  email: "admin@bandicoventures.com",
  phone: "+91 81061 36228",
  phoneHref: "+918106136228",
  /** Replace with the address on the company's incorporation certificate. */
  registeredAddress: "[REGISTERED ADDRESS — to be completed]",
  /** Courts of which city have exclusive jurisdiction. */
  jurisdiction: "[CITY, STATE — to be completed]",
  grievanceOfficer: "[NAME — to be completed]",
  /** Shown as the "last updated" date on both policies. */
  policiesUpdated: "29 September 2026",
} as const;

export const legalYear = () => new Date().getFullYear();
