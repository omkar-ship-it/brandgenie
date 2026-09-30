/**
 * Who is actually on the hook, in one place.
 *
 * The footer, both legal pages and the grievance contact all read from here
 * so they can never drift apart — a privacy policy naming one entity and a
 * terms page naming another is the kind of inconsistency that undoes both.
 *
 * `product` is BrandSquare — as of 2026-09-30 the site moved off a
 * loyalgenie.in subdomain onto its own address (brandsquare.fun) and no
 * longer carries a LoyalGenie lineage mention anywhere: it presents and is
 * legally governed as itself, full stop.
 *
 * TODO before these pages are relied on: `grievanceOfficer` is still a
 * placeholder. Indian law requires a named individual, not a role or a
 * department, for an intermediary's grievance contact.
 */
export const COMPANY = {
  legalName: "Bandico Ventures",
  /** The product these Terms and this Privacy Policy actually govern. */
  product: "BrandSquare",
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
