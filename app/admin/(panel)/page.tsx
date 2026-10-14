import type { Metadata } from "next";
import Link from "next/link";
import ContactLinks from "@/components/admin/ContactLinks";
import { PageHeader, Panel, StatTile, StatusBadge } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/adminAuth";
import { istDate } from "@/lib/bookingTypes";
import { faqs, fleet, routes, services, site, testimonials } from "@/lib/site";
import { listBookings } from "@/lib/store";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireAdmin();
  const bookings = await listBookings();

  const today = istDate();
  const weekAhead = istDate(7);
  const active = bookings.filter((b) => b.status === "new" || b.status === "confirmed");

  const awaiting = bookings.filter((b) => b.status === "new");
  const receivedToday = bookings.filter((b) => istDate(b.createdAt) === today).length;
  const travellingToday = bookings.filter((b) => b.date === today && b.status !== "cancelled").length;
  const upcoming = active
    .filter((b) => b.date >= today && b.date <= weekAhead)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const completed = bookings.filter((b) => b.status === "completed").length;

  return (
    <>
      <PageHeader title="Dashboard" intro={`Signed in as ${session.email}. Dates are in Indian time.`} />

      <div className="mt-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile value={awaiting.length} label="Awaiting confirmation" />
        <StatTile value={receivedToday} label="Received today" />
        <StatTile value={travellingToday} label="Travelling today" />
        <StatTile value={upcoming.length} label="Trips in next 7 days" />
        <StatTile value={completed} label="Completed" />
        <StatTile value={bookings.length} label="Bookings, all time" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Needs confirmation"
          action={
            <Link href="/admin/bookings" className="text-xs font-semibold text-amberdeep hover:underline">
              All bookings →
            </Link>
          }
        >
          {awaiting.length === 0 ? (
            <p className="px-5 py-6 text-sm text-khaki">Nothing waiting — every request has been handled.</p>
          ) : (
            <ul className="divide-y divide-line">
              {awaiting.slice(0, 6).map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {b.name || "Unnamed"} · {b.from} → {b.to || "—"}
                    </p>
                    <p className="font-mono text-xs text-khaki">
                      {b.service} · {b.date || "no date"}
                      {b.time ? ` ${b.time}` : ""}
                    </p>
                  </div>
                  <ContactLinks booking={b} compact />
                </li>
              ))}
            </ul>
          )}
          {awaiting.length > 6 && (
            <p className="border-t border-line px-5 py-2.5 text-xs text-khaki">+{awaiting.length - 6} more in Bookings</p>
          )}
        </Panel>

        <Panel title="Upcoming trips · next 7 days">
          {upcoming.length === 0 ? (
            <p className="px-5 py-6 text-sm text-khaki">No trips scheduled this week.</p>
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.slice(0, 8).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {b.from} → {b.to || "—"}
                    </p>
                    <p className="text-xs text-khaki">
                      {b.name || "Unnamed"} · {b.car || "Any car"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-xs font-semibold text-ink">
                      {b.date === today ? "Today" : b.date}
                      {b.time ? ` ${b.time}` : ""}
                    </p>
                    <StatusBadge status={b.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold text-ink">What&rsquo;s live on the site</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Link href="/admin/fleet" className="rounded-2xl border border-line bg-white p-5 transition-colors hover:border-amber">
          <p className="font-display text-2xl font-semibold text-ink">{fleet.length}</p>
          <p className="mt-1 text-sm text-khaki">Vehicles listed</p>
        </Link>
        <Link href="/admin/fares" className="rounded-2xl border border-line bg-white p-5 transition-colors hover:border-amber">
          <p className="font-display text-2xl font-semibold text-ink">{routes.length}</p>
          <p className="mt-1 text-sm text-khaki">Routes with fares</p>
        </Link>
        <Link href="/admin/content" className="rounded-2xl border border-line bg-white p-5 transition-colors hover:border-amber">
          <p className="font-display text-2xl font-semibold text-ink">{services.length}</p>
          <p className="mt-1 text-sm text-khaki">
            Services · {testimonials.length} reviews · {faqs.length} FAQs
          </p>
        </Link>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="font-mono text-sm font-semibold text-ink">{site.phoneDisplay}</p>
          <p className="mt-1 text-xs leading-relaxed text-khaki">
            {site.altPhones.map((p) => p.display).join(" · ")}
            <br />
            {site.email} · 24/7
          </p>
        </div>
      </div>
    </>
  );
}
