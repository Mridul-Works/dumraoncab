import type { Metadata } from "next";
import Link from "next/link";
import PrintButton from "@/components/admin/analytics/PrintButton";
import { delta, loadReport, resolveRange, signedPct } from "@/lib/analytics";
import { requireAdmin } from "@/lib/adminAuth";
import { istDate } from "@/lib/bookingTypes";
import { inr } from "@/lib/catalogTypes";
import { getCompany } from "@/lib/company";

export const metadata: Metadata = { title: "Analytics report" };

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// Analytics → Export → Download PDF report (Figma 7.3): a one-page A4 summary
// for the accountant. Opens with ?print=1 so the browser offers "Save as PDF".
export default async function AnalyticsReportPage({ searchParams }: { searchParams: Search }) {
  await requireAdmin();
  const sp = await searchParams;
  const today = istDate();
  const rangeKey = one(sp.range) ?? (one(sp.from) ? "custom" : undefined);
  const range = resolveRange({ range: rangeKey, from: one(sp.from), to: one(sp.to), cmp: one(sp.cmp) }, today);
  const [r, company] = await Promise.all([loadReport(range), getCompany()]);
  const t = r.totals;
  const p = r.prev;
  const vs = (now: number, before?: number) => {
    const d = delta(now, before);
    return d === null ? "" : `${signedPct(d)} vs ${r.range.prevShort}`;
  };
  const cell = "border-b border-gray-100 py-1.5";
  const generated = new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 print:bg-layer print:p-0">
      <div className="mx-auto mb-4 flex max-w-[794px] items-center justify-between gap-3 print:hidden">
        <Link href="/admin/analytics" className="type-body-sm text-secondary hover:text-link-hover">
          ← Back to Analytics
        </Link>
        <PrintButton auto={one(sp.print) === "1"} />
      </div>

      <article className="mx-auto flex max-w-[794px] flex-col gap-6 rounded-lg border border-gray-100 bg-layer p-10 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <header className="flex items-start gap-3 border-b border-gray-100 pb-5">
          {company.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- uploaded logo, printed
            <img src={company.logo} alt="" className="size-11 rounded-md object-cover" />
          ) : (
            <span className="grid size-11 place-items-center rounded-md bg-brand type-ui text-on-color">DC</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="type-h4 text-primary">{company.name}</p>
            <p className="type-body-sm text-secondary">
              {[`+91 ${company.phoneDisplay}`, company.gstin && `GSTIN ${company.gstin}`, company.email].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="type-ui text-primary">Business report</p>
            <p className="type-body-sm text-secondary">{range.label}</p>
          </div>
        </header>

        <section className="grid grid-cols-4 gap-4">
          {[
            ["Revenue", inr(t.revenue), vs(t.revenue, p?.revenue)],
            ["Trips", String(t.trips), vs(t.trips, p?.trips)],
            ["Net earnings", inr(t.net), vs(t.net, p?.net)],
            ["Average fare", inr(t.avgFare), vs(t.avgFare, p?.avgFare)],
          ].map(([label, value, change]) => (
            <div key={label} className="rounded-md bg-gray-50 p-3 print:border print:border-gray-100 print:bg-layer">
              <p className="type-body-sm text-secondary">{label}</p>
              <p className="type-h3 tabular-nums text-primary">{value}</p>
              {change && <p className="type-body-sm text-secondary">{change}</p>}
            </div>
          ))}
        </section>
        <p className="-mt-3 type-body-sm text-secondary">
          Net is after fuel, tolls and driver cut.
          {range.compare && p ? ` Compared with ${range.prevLabel}.` : ""}
          {r.requests ? ` ${r.requests} requests · ${r.conversionPct}% became trips · ${r.cancels.total} cancelled.` : ""}
        </p>

        <div className="grid grid-cols-2 gap-6">
          <ReportTable title="Top routes" head={["Route", "Trips", "Revenue"]} rows={r.routes.map((x) => [x.route, String(x.trips), inr(x.revenue)])} cell={cell} />
          <ReportTable title="Earnings by car" head={["Car", "Trips", "Net"]} rows={r.cars.map((c) => [c.name, String(c.trips), inr(c.net)])} cell={cell} />
          <ReportTable title="Vendors" head={["Vendor", "Trips", "Fares"]} rows={r.vendors.map((v) => [v.name, String(v.trips), inr(v.fares)])} cell={cell} />
          <ReportTable
            title="Where bookings come from"
            head={["Channel", "Trips", "Share"]}
            rows={r.sources.map((s) => [s.label, String(s.trips), `${s.pct}%`])}
            cell={cell}
          />
        </div>

        <footer className="mt-auto border-t border-gray-100 pt-3 type-body-sm text-secondary">
          Generated {generated} from bookings and the Trip log · {company.website}
        </footer>
      </article>
    </div>
  );
}

function ReportTable({ title, head, rows, cell }: { title: string; head: string[]; rows: string[][]; cell: string }) {
  return (
    <section>
      <h2 className="mb-2 type-ui text-primary">{title}</h2>
      {rows.length ? (
        <table className="w-full type-body-sm">
          <thead>
            <tr className="text-secondary">
              {head.map((h, i) => (
                <th key={h} className={`${cell} font-normal ${i ? "text-right" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-primary">
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((v, i) => (
                  <td key={i} className={`${cell} tabular-nums ${i ? "text-right" : ""}`}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="type-body-sm text-secondary">Nothing in this range.</p>
      )}
    </section>
  );
}
