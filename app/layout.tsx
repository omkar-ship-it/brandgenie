import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { IconGift, IconStore, IconTag } from "@/components/icons";
import { VisitorCount } from "@/components/VisitorCount";
import { Footer } from "@/components/Footer";
import { COMPANY } from "@/lib/company";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = IBM_Plex_Mono({ variable: "--font-mono-face", subsets: ["latin"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: COMPANY.product,
  description: "Brands list for the board. Customers vote them up it. One round a day decides who you walk away with.",
};

// The two sides of the product get different doors. A signed-out visitor
// sees the customer set plus the way in for brands.
//
// Brand Corner and Drops are concept previews, not live features — they're
// on every list because validating them needs both audiences to see them,
// but they carry the "Soon" mark (below) rather than sitting among the
// things that actually work today.
const CUSTOMER_LINKS = [
  { href: "/", label: "Board" },
  { href: "/try", label: "Try it" },
  { href: "/wish", label: "Wishes" },
  { href: "/rewards", label: "My rewards" },
  { href: "/corner", label: "Brand Corner" },
  { href: "/drops", label: "Drops" },
];
const MERCHANT_LINKS = [
  { href: "/", label: "Board" },
  { href: "/brand", label: "My tile" },
  { href: "/wish", label: "Wishes" },
  { href: "/corner", label: "Brand Corner" },
  { href: "/drops", label: "Drops" },
];
const GUEST_LINKS = [...CUSTOMER_LINKS, { href: "/brand", label: "For brands" }];
const SOON_HREFS = new Set(["/corner", "/drops"]);

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  const isMerchant = user?.role === "merchant";
  const links = !user ? GUEST_LINKS : isMerchant ? MERCHANT_LINKS : CUSTOMER_LINKS;

  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full`}>
      {/* A column so the footer sits under the content on a short page
          rather than floating up into the middle of the viewport. */}
      <body className="flex min-h-full flex-col">
        <nav className="sticky top-0 z-40 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-card/85 px-5 py-3 backdrop-blur">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            {/* The whole character, standing beside the wordmark rather than
                boxed into a square — he is wider than he is tall, so a square
                mark either crops him or shrinks him to nothing. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/genie.png" alt="" className="brandmark" />
            {COMPANY.product}
          </Link>
          <div className="flex flex-wrap items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-3 py-1.5 text-[13px] text-ink-soft transition-colors hover:bg-sunk hover:text-ink${
                  l.href === "/try"
                    ? " navtry"
                    : l.href === "/wish"
                      ? " navwish"
                      : SOON_HREFS.has(l.href)
                        ? " navsoon"
                        : ""
                }`}
              >
                {l.label}
              </Link>
            ))}
            <VisitorCount />
          </div>
          <div className="ml-auto flex items-center gap-2 text-[12.5px]">
            {user ? (
              <>
                <span
                  className="pill hidden sm:inline-flex"
                  style={{
                    background: isMerchant ? "var(--gold)" : "var(--sunk)",
                    color: isMerchant ? "#fff" : "var(--ink-soft)",
                  }}
                >
                  {isMerchant ? (
                    <>
                      <IconStore size={13} /> Brand
                    </>
                  ) : (
                    <>
                      <IconGift size={13} /> Player
                    </>
                  )}
                </span>
                <span className="hidden text-ink-soft sm:inline">{user.email}</span>
                <form action="/api/auth/logout" method="post">
                  <button className="btn btn-ghost px-3 py-1.5 text-[12.5px]">Sign out</button>
                </form>
              </>
            ) : (
              <>
                {/* Sign-in stays reachable, but the prominent corner button is
                    the merchant one — this board is pitched at brands. */}
                <Link href="/login" className="px-1 text-ink-soft hover:text-ink hover:underline">
                  Sign in
                </Link>
                <Link
                  href="/login?next=/brand&as=merchant"
                  className="btn btn-primary px-4 py-1.5 text-[12.5px]"
                >
                  {/* One flex item, so .btn's gap doesn't open up mid-label. */}
                  {/* Icon and label are the two flex items; the optional
                      words live *inside* the label so .btn's gap can't open
                      a hole in the middle of it. */}
                  <IconTag size={14} />
                  <span>
                    List<span className="hidden sm:inline"> your brand</span>
                  </span>
                </Link>
              </>
            )}
          </div>
        </nav>
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
