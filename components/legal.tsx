import { COMPANY } from "@/lib/company";

/**
 * Shared furniture for the policy pages.
 *
 * A legal page is read in two modes — skimmed for one clause by someone in a
 * dispute, and read end to end by a payment gateway's reviewer — so numbered
 * sections carry anchors and the prose stays in short, quotable paragraphs.
 */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-[28px] font-semibold">{title}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{intro}</p>
        <p className="mono mt-3 text-[12px] text-ink-soft">
          Last updated {COMPANY.policiesUpdated} · {COMPANY.legalName}
        </p>
      </header>
      <div className="legal">{children}</div>
    </div>
  );
}

/** One numbered clause, anchored so it can be linked to and cited. */
export function Clause({ n, id, title, children }: { n: number; id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-7 scroll-mt-20">
      <h2 className="text-[16px] font-semibold">
        <span className="mono mr-2 text-ink-soft">{n}.</span>
        {title}
      </h2>
      <div className="mt-2 grid gap-2.5">{children}</div>
    </section>
  );
}

/** Set apart because a reader who skims everything else must still see it. */
export function Important({ children }: { children: React.ReactNode }) {
  return <div className="legal-important">{children}</div>;
}
