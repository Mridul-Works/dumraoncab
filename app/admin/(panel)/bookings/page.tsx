import type { Metadata } from "next";
import Link from "next/link";
import BookingsManager from "@/components/admin/BookingsManager";
import Icon from "@/components/admin/Icon";
import { PageHeader, btnGhost, btnPrimary } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/adminAuth";
import { istDate, istTime } from "@/lib/bookingTypes";
import { getCompany } from "@/lib/company";
import { listCars } from "@/lib/fleet";
import { listEntries } from "@/lib/journal";
import { listBookings } from "@/lib/store";
import { listApprovedVendors } from "@/lib/vendors";

export const metadata: Metadata = { title: "Bookings" };

export default async function BookingsPage() {
  await requireAdmin();
  const [bookings, cars, entries, vendors, company] = await Promise.all([listBookings(), listCars(), listEntries(), listApprovedVendors(), getCompany()]);
  const journaled = [...new Set(entries.map((e) => e.bookingId).filter((id): id is string => Boolean(id)))];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Bookings" intro="Requests from the website booking form and hero widget, newest first.">
        {/* Plain link: a route handler download, not a client navigation. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/bookings/export" className={btnGhost}>
          Export CSV
        </a>
        <Link href="/admin/bookings/new" className={btnPrimary}>
          <Icon name="plus" size={16} />
          Add phone booking
        </Link>
      </PageHeader>
      <BookingsManager
        bookings={bookings}
        cars={cars.map((c) => ({ id: c.id, name: c.name, number: c.number, type: c.type, seats: c.seats }))}
        // Only what the assign list shows — no documents or bank details reach the browser.
        vendors={vendors.map((v) => ({
          id: v.id,
          name: v.name,
          mobile: v.mobile,
          rating: v.rating,
          trips: v.trips,
          cars: v.cars.map((c) => ({ id: c.id, model: c.model, number: c.number, seats: c.seats })),
        }))}
        office={`+91 ${company.phoneDisplay}`}
        journaled={journaled}
        today={istDate()}
        now={istTime()}
      />
    </div>
  );
}
