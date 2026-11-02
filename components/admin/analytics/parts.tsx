import { cardCls } from "@/components/admin/ui";
import { delta, signedPct, type Report } from "@/lib/analytics";
import { inr } from "@/lib/catalogTypes";

// Server-safe building blocks of the Analytics page (Figma 7.1). Charts are
// plain divs — no chart library.

export function Card({ title, note, children, className = "" }: { title: string; note?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 p-5 md:p-6 ${cardCls} ${className}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="flex-1 type-h3 text-primary">{title}</h2>
        {note && <p className="type-body-sm text-secondary">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Delta({ now, before }: { now: number; before?: number }) {
  const d = delta(now, before);
  if (d === null) return null;
  return <span className={`rounded-full px-2 py-0.5 type-body-sm ${d < 0 ? "bg-tag-red text-tag-red" : "bg-tag-green text-brand"}`}>{signedPct(d)}</span>;
}

export function KpiStrip({ r }: { r: Report }) {
  const t = r.totals;
  const p = r.prev ?? undefined;
  const stats = [
    { label: "Revenue", num: t.revenue, value: inr(t.revenue), before: p?.revenue, sub: p ? `vs ${inr(p.revenue)} in ${r.range.prevShort}` : "fares from trips run" },
    { label: "Trips", num: t.trips, value: String(t.trips), before: p?.trips, sub: p ? `${p.trips} in ${r.range.prevShort}` : "logged or completed" },
    { label: "Net earnings", num: t.net, value: inr(t.net), before: p?.net, sub: "after fuel, tolls and driver cut" },
    { label: "Average fare", num: t.avgFare, value: inr(t.avgFare), before: p?.avgFare, sub: "per trip" },
  ];
  return (
    <dl className={`grid grid-cols-2 overflow-hidden lg:grid-cols-4 ${cardCls}`}>
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`flex min-w-0 flex-col gap-1.5 border-gray-100 px-5 py-4 md:px-6 md:py-5 ${i % 2 === 1 ? "border-l" : ""} ${i > 1 ? "border-t lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
        >
          <dt className="type-body-sm text-secondary">{s.label}</dt>
          <dd className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="type-h2 tabular-nums text-primary">{s.value}</span>
            {r.prev && <Delta now={s.num} before={s.before} />}
          </dd>
          <dd className="type-body-sm text-secondary">{s.sub}</dd>
        </div>
      ))}
    </dl>
  );
}

// Revenue by day (or by month for long ranges): grey bars, best one in brand green.
export function RevenueChart({ r }: { r: Report }) {
  const peak = Math.max(1, ...r.chart.map((c) => c.value));
  const bestKey = r.best ? r.chart.reduce((b, c) => (c.value > b.value ? c : b), r.chart[0]).key : "";
  const n = r.chart.length;
  // Five evenly spaced axis labels (fewer for short ranges).
  const ticks = n <= 5 ? r.chart.map((_, i) => i) : [0, 1, 2, 3, 4].map((k) => Math.round((k * (n - 1)) / 4));
  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-[200px]">
        {[0, 25, 50, 75].map((top) => (
          <span key={top} className="absolute inset-x-0 h-px bg-gray-100" style={{ top: `${top}%` }} aria-hidden="true" />
        ))}
        <div className={`relative flex h-full items-end ${n > 40 ? "gap-px" : n > 20 ? "gap-1.5" : "gap-2"}`}>
          {r.chart.map((c) => (
            <div key={c.key} className="flex h-full min-w-0 flex-1 items-end justify-center" title={`${c.label}: ${inr(c.value)}`}>
              <span
                className={`block w-full max-w-12 rounded-t-sm ${c.key === bestKey ? "bg-brand" : "bg-gray-100"}`}
                style={{ height: c.value ? `${Math.max(2, (c.value / peak) * 95)}%` : "0" }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between gap-2">
        {ticks.map((i) => (
          <span key={i} className="type-body-sm text-secondary">
            {r.chart[i]?.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Simple table: first column flexes, the rest are right-aligned numbers.
export function DataTable({ head, widths, rows }: { head: string[]; widths: string[]; rows: (string | number)[][] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-3 type-body-sm text-secondary">
        <span className="min-w-0 flex-1">{head[0]}</span>
        {head.slice(1).map((h, i) => (
          <span key={h} className={`shrink-0 text-right ${widths[i]}`}>
            {h}
          </span>
        ))}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} className="flex items-center gap-3 border-t border-gray-100 pt-2.5">
          <span className="min-w-0 flex-1 truncate type-ui text-primary">{row[0]}</span>
          {row.slice(1).map((v, i) => (
            <span key={i} className={`shrink-0 text-right type-body-md tabular-nums text-secondary ${widths[i]}`}>
              {v}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function Meter({ value, max, tone = "brand", h = "h-2" }: { value: number; max: number; tone?: "brand" | "gray"; h?: string }) {
  return (
    <span className={`block overflow-hidden rounded-full bg-gray-100 ${h}`}>
      <span className={`block h-full rounded-full ${tone === "brand" ? "bg-brand" : "bg-[var(--icon-secondary)]"}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </span>
  );
}

export const Quiet = ({ children }: { children: React.ReactNode }) => <p className="py-6 text-center type-body-sm text-secondary">{children}</p>;
