import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import ExportMenu from "@/components/admin/analytics/ExportMenu";
import AnalyticsHeader from "@/components/admin/analytics/Header";
import LoadFailed from "@/components/admin/analytics/LoadFailed";
import AnalyticsSkeleton from "@/components/admin/analytics/Skeleton";
import { Card, DataTable, KpiStrip, Meter, Quiet, RevenueChart } from "@/components/admin/analytics/parts";
import { btnGhost, btnPrimary, cardCls } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/adminAuth";
import { loadReport, reportText, resolveRange, type Range, type Report } from "@/lib/analytics";
import { istDate } from "@/lib/bookingTypes";
import { inr } from "@/lib/catalogTypes";
import { getCompany } from "@/lib/company";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Analytics" };

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// /admin/analytics — Figma Flow 7: 7.1 overview · 7.2 date range · 7.3 export
// · 7.4 no data yet · 7.5 report sent · 7.6 couldn't load · 7.7 report didn't
// send · 7.8 loading. Everything is worked out from bookings, the trip log,
// the fleet and vendors (lib/analytics.ts). The header shows at once; the
// numbers stream in behind a skeleton, again on every range change.
export default async function AnalyticsPage({ searchParams }: { searchParams: Search }) {
  await requireAdmin();
  const sp = await searchParams;
  const today = istDate();
  const range = resolveRange({ range: one(sp.range), from: one(sp.from), to: one(sp.to), cmp: one(sp.cmp) }, today);

  return (
    <div className="flex flex-col gap-6">
      <Suspense
        key={`${range.from}-${range.to}-${range.compare}`}
        fallback={
          <>
            <AnalyticsHeader range={range} today={today} />
            <AnalyticsSkeleton />
          </>
        }
      >
        <AnalyticsBody range={range} today={today} />
      </Suspense>
    </div>
  );
}

async function AnalyticsBody({ range, today }: { range: Range; today: string }) {
  let r: Report;
  let company: Awaited<ReturnType<typeof getCompany>>;
  try {
    [r, company] = await Promise.all([loadReport(range), getCompany()]);
  } catch (err) {
    console.error("Analytics couldn't load", err);
    // 7.6 — couldn't load the numbers.
    return (
      <>
        <AnalyticsHeader range={range} today={today} />
        <LoadFailed />
      </>
    );
  }

  const qs = new URLSearchParams({ from: range.from, to: range.to, ...(range.compare ? {} : { cmp: "0" }) });
  if (range.key !== "custom") qs.set("range", range.key);
  const reportPath = `/admin/analytics-report?${qs}`;
  const owner = company.whatsapp.replace(/\D/g, "");
  const ownerLine = owner.length >= 10 ? `+91 ${owner.slice(-10, -5)} ${owner.slice(-5)}` : company.phoneDisplay;
  const waText = reportText(r, company.name, `${site.url}${reportPath}`);
  const waHref = `https://wa.me/${owner}?text=${encodeURIComponent(waText)}`;

  const header = (
    <AnalyticsHeader range={range} today={today}>
      <ExportMenu csvHref={`/admin/analytics-export?${qs}`} pdfHref={`${reportPath}&print=1`} waHref={waHref} ownerLine={ownerLine} rangeLabel={range.label} />
    </AnalyticsHeader>
  );

  // 7.4 — nothing logged or booked yet.
  if (!r.hasAnyData) {
    return (
      <>
        {header}
        <section className={`flex flex-col items-center px-6 py-20 text-center ${cardCls}`}>
          <div className="flex w-full max-w-[520px] flex-col items-center gap-2 py-10">
            <Image src="/admin-illustrations/analytics-empty.svg" alt="" width={240} height={160} unoptimized className="h-40 w-60" />
            <h2 className="mt-3 type-h3 text-primary">Numbers show up after your first week</h2>
            <p className="type-body-md text-secondary">
              Analytics fills in from bookings and Daily Diary entries. Add today’s trips in the Daily Diary to see earnings by car.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <Link href="/admin/journal" className={btnPrimary}>
                Open Daily Diary
              </Link>
              <Link href="/admin/bookings" className={btnGhost}>
                Go to bookings
              </Link>
            </div>
          </div>
        </section>
      </>
    );
  }

  const maxSource = Math.max(1, ...r.sources.map((s) => s.trips));
  const maxReason = Math.max(1, ...r.cancels.reasons.map((x) => x.count));

  return (
    <>
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
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="type-body-sm text-secondary">Requests that became trips</p>
              <p className="type-h2 text-primary">{r.conversionPct === null ? "—" : `${r.conversionPct}%`}</p>
            </div>
            <p className="type-body-sm text-secondary">
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
              No trips logged for your cars in this range. <Link href="/admin/journal" className="text-link hover:text-link-hover">Open Daily Diary</Link>
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
    </>
  );
}
