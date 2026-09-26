import type { BrandStats, DayRow } from "@/lib/stats";

const fmtDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/**
 * A brand's day at a glance. Three numbers for today, then a week of bars
 * so a brand can see whether a bid changed anything — which is the only
 * evidence that a position is worth paying for.
 */
export function BrandStatsPanel({ stats }: { stats: BrandStats }) {
  const peak = Math.max(1, ...stats.days.map((d) => Math.max(d.clicks, d.won, d.redeemed)));

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-semibold">Your numbers</h2>
        <span className="mono text-[11.5px] text-ink-soft">today, IST</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Today label="Tile opens" value={stats.today.clicks} total={stats.totals.clicks} />
        <Today label="Rewards won" value={stats.today.won} total={stats.totals.won} />
        <Today label="Redeemed" value={stats.today.redeemed} total={stats.totals.redeemed} />
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-soft">
          <Key color="var(--brand)" label="opens" />
          <Key color="var(--gold)" label="won" />
          <Key color="var(--good)" label="redeemed" />
          <span className="ml-auto">last 7 days</span>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2">
          {stats.days.map((d) => (
            <DayColumn key={d.day} day={d} peak={peak} />
          ))}
        </div>
      </div>

      {stats.totals.gifted > 0 && (
        <p className="mt-5 text-[12.5px] text-ink-soft">
          <span className="mono font-semibold">{stats.totals.gifted}</span> of your rewards were passed on to a
          friend — each one put your brand in front of someone new.
        </p>
      )}
    </section>
  );
}

function Today({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div className="rounded-xl bg-sunk p-3">
      <div className="text-[10.5px] font-semibold tracking-wide text-ink-soft uppercase">{label}</div>
      <div className="mono mt-1 text-[24px] leading-none font-semibold">{value}</div>
      <div className="mono mt-1 text-[11px] text-ink-soft">{total} all time</div>
    </div>
  );
}

function Key({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function DayColumn({ day, peak }: { day: DayRow; peak: number }) {
  // flex-1 + min-w-0, not w-full: three full-width bars overflow the column
  // and drag the whole cluster out from under its date label.
  const bar = (n: number, label: string, color: string) => (
    <span
      className="min-w-0 flex-1 rounded-t-[2px]"
      style={{
        height: n > 0 ? `${Math.max(4, (n / peak) * 100)}%` : "2px",
        background: n > 0 ? color : "var(--line)",
      }}
      title={`${label}: ${n}`}
    />
  );
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <div className="flex h-[74px] w-full items-end gap-[2px]">
        {bar(day.clicks, "opens", "var(--brand)")}
        {bar(day.won, "won", "var(--gold)")}
        {bar(day.redeemed, "redeemed", "var(--good)")}
      </div>
      <span className="mono text-[9.5px] whitespace-nowrap text-ink-soft">{fmtDay(day.day)}</span>
    </div>
  );
}
