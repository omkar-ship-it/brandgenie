/**
 * Who is actually on the hook, in one place.
 *
 * The footer, both legal pages and the grievance contact all read from here
 * so they can never drift apart — a privacy policy naming one entity and a
 * terms page naming another is the kind of inconsistency that undoes both.
 *
 * `product` is BrandSquare, not LoyalGenie, as of 2026-09-30 — the site moved
 * off a loyalgenie.in subdomain onto its own address (brandsquare.fun), so it
 * now presents and is legally governed as itself rather than as a board
 * living inside a bigger LoyalGenie site. `parentPlatform` keeps the lineage
 * on record as a mention, not as the subject of the contract.
 *
 * TODO before these pages are relied on: `grievanceOfficer` is still a
 * placeholder. Indian law requires a named individual, not a role or a
 * department, for an intermediary's grievance contact.
 */
export const COMPANY = {
  legalName: "Bandico Ventures",
  /** The product these Terms and this Privacy Policy actually govern. */
  product: "BrandSquare",
  /** The loyalty-engagement line BrandSquare is built on — a lineage credit
   *  in the footer, not the legal subject of these pages. */
  parentPlatform: "LoyalGenie",
  parentPlatformTagline: "a gamified customer engagement and loyalty platform",
  email: "admin@bandicoventures.com",
  phone: "+91 81061 36228",
  phoneHref: "+918106136228",
  registeredAddress: "8-2/1 Main Road, Maddulagudem, Dammapeta, Khammam - 507306, Telangana",
  /** Courts of which city have exclusive jurisdiction. */
  jurisdiction: "Hyderabad, Telangana",
  grievanceOfficer: "[NAME — to be completed]",
  /** Shown as the "last updated" date on both policies. */
  policiesUpdated: "30 September 2026",
} as const;

export const legalYear = () => new Date().getFullYear();
