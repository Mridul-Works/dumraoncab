import type { Metadata } from "next";
import Image from "next/image";
import AdminLogin from "@/components/admin/AdminLogin";
import BookingsPanel, { LogoutButton } from "@/components/admin/BookingsPanel";
import { isAuthed } from "@/lib/adminAuth";
import { listBookings } from "@/lib/store";
import { faqs, fleet, hourlyPackages, perKmRates, routes, services, site, testimonials } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="font-display text-3xl font-extrabold text-ink">{value}</p>
      <p className="mt-1 text-sm font-medium text-khaki">{label}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl font-extrabold text-ink">{children}</h2>;
}

export default async function AdminPage() {
  if (!(await isAuthed())) {
    return <AdminLogin />;
  }

  const bookings = await listBookings();
  const today = new Date().toISOString().slice(0, 10);
  const newCount = bookings.filter((b) => b.status === "new").length;
  const todayCount = bookings.filter((b) => b.createdAt.slice(0, 10) === today).length;
  const travellingToday = bookings.filter((b) => b.date === today && b.status !== "cancelled").length;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-amberdeep">
            Admin panel
          </p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
            Everything in one place
          </h1>
        </div>
        <LogoutButton />
      </div>

      {/* Booking stats */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile value={bookings.length} label="Website bookings, all time" />
        <StatTile value={newCount} label="Awaiting confirmation" />
        <StatTile value={todayCount} label="Received today" />
        <StatTile value={travellingToday} label="Travelling today" />
      </div>

      {/* Bookings */}
      <section className="mt-10">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <SectionTitle>Booking requests</SectionTitle>
          <p className="text-xs text-khaki">
            From the website widget &amp; form. Newest first. Change status as you confirm trips.
          </p>
        </div>
        <BookingsPanel bookings={bookings} />
      </section>

      {/* Fleet */}
      <section className="mt-12">
        <SectionTitle>Fleet ({fleet.length} vehicles listed)</SectionTitle>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-wider text-khaki">
                <th className="px-4 py-3 font-semibold">Vehicle</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Seats</th>
                <th className="px-4 py-3 font-semibold">Specs</th>
                <th className="px-4 py-3 text-right font-semibold">Rate</th>
              </tr>
            </thead>
            <tbody>
              {fleet.map((v) => (
                <tr key={v.name} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-3">
                      <span className="relative block h-9 w-12 overflow-hidden rounded-md bg-cream">
                        <Image src={v.image} alt="" fill sizes="48px" className="object-cover" />
                      </span>
                      <span className="font-semibold text-ink">{v.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-khaki">{v.category}</td>
                  <td className="px-4 py-2.5 text-khaki">{v.seats}</td>
                  <td className="px-4 py-2.5 text-khaki">
                    {v.transmission} · {v.fuel}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-ink">{v.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Routes & fares */}
      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <div>
          <SectionTitle>Routes ({routes.length})</SectionTitle>
          <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
            <table className="w-full text-sm">
              <tbody>
                {routes.map((r) => (
                  <tr key={r.slug} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-2.5 font-semibold text-ink">
                      {r.from} → {r.to}
                    </td>
                    <td className="px-4 py-2.5 text-khaki">
                      {r.distance} · {r.duration}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-ink">
                      from {r.fareFrom}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <SectionTitle>Published fares</SectionTitle>
          <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
            <table className="w-full text-sm">
              <tbody>
                {perKmRates.map((r) => (
                  <tr key={r.category} className="border-b border-line">
                    <td className="px-4 py-2.5 font-semibold text-ink">{r.category}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-ink">{r.rate}</td>
                  </tr>
                ))}
                {hourlyPackages.map((p) => (
                  <tr key={p.name} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-2.5 font-semibold text-ink">{p.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-ink">{p.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-khaki">
            Fares, fleet, routes and all site text are edited in <code className="rounded bg-cream px-1.5 py-0.5 font-mono">lib/site.ts</code>.
          </p>
        </div>
      </section>

      {/* Content & contact overview */}
      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile value={services.length} label="Services published" />
        <StatTile value={testimonials.length} label="Testimonials on site" />
        <StatTile value={faqs.length} label="FAQs answered" />
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="font-mono text-sm font-semibold text-ink">{site.phoneDisplay}</p>
          <p className="mt-1 text-xs text-khaki">
            {site.altPhones.map((p) => p.display).join(" · ")}
            <br />
            {site.email} · 24/7
          </p>
        </div>
      </section>
    </div>
  );
}
