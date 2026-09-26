import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = IBM_Plex_Mono({ variable: "--font-mono-face", subsets: ["latin"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: "BrandGenie",
  description: "Brands bid for the board. One round a day decides who you walk away with.",
};

// The two sides of the product get different doors. A signed-out visitor
// sees the customer set plus the way in for brands.
const CUSTOMER_LINKS = [
  { href: "/", label: "Board" },
  { href: "/wish", label: "Wishes" },
  { href: "/rewards", label: "My rewards" },
];
const MERCHANT_LINKS = [
  { href: "/", label: "Board" },
  { href: "/brand", label: "My tile" },
  { href: "/wish", label: "Wishes" },
];
const GUEST_LINKS = [...CUSTOMER_LINKS, { href: "/brand", label: "For brands" }];

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  const isMerchant = user?.role === "merchant";
  const links = !user ? GUEST_LINKS : isMerchant ? MERCHANT_LINKS : CUSTOMER_LINKS;

  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full`}>
      <body className="min-h-full">
        <nav className="sticky top-0 z-40 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-card/85 px-5 py-3 backdrop-blur">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span
              className="grid h-7 w-7 place-items-center rounded-lg text-[15px]"
              style={{ background: "linear-gradient(140deg, var(--brand), var(--brand-deep))" }}
            >
              🧞
            </span>
            BrandGenie
          </Link>
          <div className="flex flex-wrap items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full px-3 py-1.5 text-[13px] text-ink-soft transition-colors hover:bg-sunk hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
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
                  {isMerchant ? "🏪 Brand" : "🎁 Player"}
                </span>
                <span className="hidden text-ink-soft sm:inline">{user.email}</span>
                <form action="/api/auth/logout" method="post">
                  <button className="btn btn-ghost px-3 py-1.5 text-[12.5px]">Sign out</button>
                </form>
              </>
            ) : (
              <Link href="/login" className="btn btn-primary px-4 py-1.5 text-[12.5px]">
                Sign in
              </Link>
            )}
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
