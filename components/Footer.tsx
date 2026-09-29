import Link from "next/link";
import { COMPANY, legalYear } from "@/lib/company";

/**
 * The footer carries the things a payment gateway, a regulator and a
 * suspicious customer all look for in the same place: who runs this, how to
 * reach a human, and where the terms are.
 *
 * Rendered on every page rather than only the marketing ones — someone
 * deciding whether to hand over money is most likely to look for it from
 * the bid page, not the home page.
 */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-sunk">
      <div className="mx-auto grid max-w-[1080px] gap-6 px-4 py-9 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/genie.png" alt="" className="brandmark" />
            {COMPANY.product}
          </div>
          <p className="mt-2 max-w-[38ch] text-[12.5px] leading-relaxed text-ink-soft">
            Brands bid for a place on the board. Customers play one round a day for a reward. Rewards are
            provided and honoured by the brands themselves.
          </p>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">Legal</h3>
          <ul className="mt-2.5 grid gap-1.5 text-[12.5px]">
            <li>
              <Link href="/terms" className="text-ink-soft hover:text-ink hover:underline">
                Terms &amp; Conditions
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-ink-soft hover:text-ink hover:underline">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms#refunds" className="text-ink-soft hover:text-ink hover:underline">
                Refunds &amp; Cancellation
              </Link>
            </li>
            <li>
              <Link href="/terms#deletion" className="text-ink-soft hover:text-ink hover:underline">
                Account deletion
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">Contact</h3>
          <ul className="mt-2.5 grid gap-1.5 text-[12.5px]">
            <li>
              <a href={`mailto:${COMPANY.email}`} className="text-ink-soft hover:text-ink hover:underline">
                {COMPANY.email}
              </a>
            </li>
            <li>
              <a href={`tel:${COMPANY.phoneHref}`} className="mono text-ink-soft hover:text-ink hover:underline">
                {COMPANY.phone}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-[12px] text-ink-soft sm:px-6">
          <span>
            © {legalYear()} {COMPANY.legalName}. All rights reserved.
          </span>
          <span>
            {COMPANY.product} is a product of {COMPANY.legalName}.
          </span>
        </div>
      </div>
    </footer>
  );
}
