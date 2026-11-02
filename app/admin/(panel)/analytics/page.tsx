import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ExportMenu from "@/components/admin/analytics/ExportMenu";
import RangeSwitch from "@/components/admin/analytics/RangeSwitch";
import { Card, DataTable, KpiStrip, Meter, Quiet, RevenueChart } from "@/components/admin/analytics/parts";
import { btnGhost, btnPrimary, cardCls } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/adminAuth";
import { loadReport, reportText, resolveRange } from "@/lib/analytics";
import { istDate } from "@/lib/bookingTypes";
import { inr } from "@/lib/catalogTypes";
import { getCompany } from "@/lib/company";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Analytics" };

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// /admin/analytics — Figma Flow 7: 7.1 overview · 7.2 date range · 7.3 export
// · 7.4 no data yet · 7.5 report sent. Everything is worked out from bookings,
// the trip log, the fleet and vendors (lib/analytics.ts).
export default async function AnalyticsPage({ searchParams }: { searchParams: Search }) {
  await requireAdmin();
  const sp = await searchParams;
  const today = istDate();
  const range = resolveRange({ range: one(sp.range), from: one(sp.from), to: one(sp.to), cmp: one(sp.cmp) }, today);
  const [r, company] = await Promise.all([loadReport(range), getCompany()]);

  const qs = new URLSearchParams({ from: range.from, to: range.to, ...(range.compare ? {} : { cmp: "0" }) });
  if (range.key !== "custom") qs.set("range", range.key);
  const reportPath = `/admin/analytics-report?${qs}`;
  const owner = company.whatsapp.replace(/\D/g, "");
  const ownerLine = owner.length >= 10 ? `+91 ${owner.slice(-10, -5)} ${owner.slice(-5)}` : company.phoneDisplay;
  const waText = reportText(r, company.name, `${site.url}${reportPath}`);
  const waHref = `https://wa.me/${owner}?text=${encodeURIComponent(waText)}`;

  const header = (
    <div className="flex flex-wrap items-center gap-4">
      <div className="min-w-[min(100%,16rem)] flex-1">
        <h1 className="type-h1 text-primary">Analytics</h1>
        <p className="mt-1 type-body-md text-secondary">
          {range.label}
          {range.compare && ` · compared with ${range.prevLabel}`}
        </p>
      </div>
      <RangeSwitch key={`${range.key}-${range.from}-${range.to}-${range.compare}`} current={range.key} from={range.from} to={range.to} compare={range.compare} today={today} />
      {r.hasAnyData && <ExportMenu csvHref={`/admin/analytics-export?${qs}`} pdfHref={`${reportPath}&print=1`} waHref={waHref} ownerLine={ownerLine} rangeLabel={range.label} />}
    </div>
  );

  // 7.4 — nothing logged or booked yet.
  if (!r.hasAnyData) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <section className={`flex flex-col items-center px-6 py-20 text-center ${cardCls}`}>
          <Image src="/admin-illustrations/analytics-empty.svg" alt="" width={240} height={160} unoptimized className="h-40 w-60" />
          <h2 className="mt-5 type-h3 text-primary">Numbers show up after your first week</h2>
          <p className="mt-2 max-w-[472px] type-body-md text-secondary">
            Analytics fills in from bookings and Trip log entries. Add today’s trips in the Trip log to see earnings by car.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/admin/journal" className={btnPrimary}>
              Open Trip log
            </Link>
            <Link href="/admin/bookings" className={btnGhost}>
              Go to bookings
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const maxSource = Math.max(1, ...r.sources.map((s) => s.trips));
  const maxReason = Math.max(1, ...r.cancels.reasons.map((x) => x.count));

  return (
    <div className="flex flex-col gap-6">
      {header}

      <KpiStrip r={r} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card title={r.chartUnit === "day" ? "Revenue by day" : "Revenue by month"} note={r.best ? `Best ${r.chartUnit}: ${r.best.label} · ${inr(r.best.value)}` : "No fares in this range yet"}>
          <RevenueChart r={r} />
        </Card>

        <Card title="Where bookings come from">
          {r.sources.map((s) => (
            <div key={s.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline gap-3">
                <span className="flex-1 type-ui text-primary">{s.label}</span>
                <span className="type-body-sm text-secondary">
                  {s.trips} trip{s.trips === 1 ? "" : "s"} · {s.pct}%
                </span>
              </div>
              <Meter value={s.trips} max={maxSource} />
            </div>
          ))}
          <span className="h-px w-2.5 bg-gray-100" aria-hidden="true" />
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <p className="type-body-sm text-secondary">Requests that became trips</p>
              <p className="type-h2 text-primary">{r.conversionPct === null ? "—" : `${r.conversionPct}%`}</p>
            </div>
            <p className="pb-1.5 type-body-sm text-secondary">
              {r.requests} request{r.requests === 1 ? "" : "s"}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card title="Top routes" note="By revenue">
          {r.routes.length ? (
            <DataTable head={["Route", "Trips", "Revenue", "Avg"]} widths={["w-14", "w-[90px]", "w-[70px]"]} rows={r.routes.map((x) => [x.route, x.trips, inr(x.revenue), inr(x.avg)])} />
          ) : (
            <Quiet>No trips in this range.</Quiet>
          )}
        </Card>
        <Card title="Earnings by car" note="Net after fuel and driver cut">
          {r.cars.length ? (
            <DataTable
              head={["Car", "Trips", "Km", "Net"]}
              widths={["w-14", "w-[70px]", "w-[90px]"]}
              rows={r.cars.map((c) => [c.name, c.trips, c.km ? c.km.toLocaleString("en-IN") : "—", inr(c.net)])}
            />
          ) : (
            <Quiet>
              No trips logged for your cars in this range. <Link href="/admin/journal" className="text-link hover:text-link-hover">Open Trip log</Link>
            </Quiet>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card title="Vendors" note="Fares on trips their drivers ran">
          {r.vendors.length ? (
            <DataTable
              head={["Vendor", "Trips", "Rating", "Fares"]}
              widths={["w-14", "w-[60px]", "w-[90px]"]}
              rows={r.vendors.map((v) => [v.name, v.trips, v.rating ? v.rating.toFixed(1) : "—", inr(v.fares)])}
            />
          ) : (
            <Quiet>No vendor trips in this range.</Quiet>
          )}
        </Card>
        <Card title="Cancellations" note={r.requests ? `${r.cancels.total} of ${r.requests} · ${Math.round((r.cancels.total / r.requests) * 100)}%` : undefined}>
          {r.cancels.reasons.length ? (
            <>
              {r.cancels.reasons.map((x) => (
                <div key={x.label} className="flex items-center gap-3 border-t border-gray-100 pt-2.5">
                  <span className="min-w-0 flex-1 type-body-md text-primary">{x.label}</span>
                  <span className="w-[120px] shrink-0">
                    <Meter value={x.count} max={maxReason} tone="gray" h="h-1.5" />
                  </span>
                  <span className="w-5 shrink-0 text-right type-ui text-primary">{x.count}</span>
                </div>
              ))}
              {r.cancels.noCarNote && <p className="rounded-sm bg-gray-50 p-3 type-body-sm text-secondary">{r.cancels.noCarNote}</p>}
            </>
          ) : (
            <Quiet>No cancellations in this range.</Quiet>
          )}
        </Card>
      </div>
    </div>
  );
}
