import type { Metadata } from "next";
import BookingsManager from "@/components/admin/BookingsManager";
import { BookingsHeader } from "@/components/admin/bookings/BookingsChrome";
import { requireAdmin } from "@/lib/adminAuth";
import { istDate, istTime } from "@/lib/bookingTypes";
import { getCompany } from "@/lib/company";
import { listCars } from "@/lib/fleet";
import { listEntries } from "@/lib/journal";
import { listBookings } from "@/lib/store";
import { listApprovedVendors } from "@/lib/vendors";

export const metadata: Metadata = { title: "Bookings" };

// Figma 3.1–3.11. Loading (3.8) and couldn't-load (3.9) live in loading.tsx /
// error.tsx beside this page, in the (list) group so they don't wrap bookings/new.

export default async function BookingsPage() {
  await requireAdmin();
  const [bookings, cars, entries, vendors, company] = await Promise.all([listBookings(), listCars(), listEntries(), listApprovedVendors(), getCompany()]);
  const journaled = [...new Set(entries.map((e) => e.bookingId).filter((id): id is string => Boolean(id)))];

  return (
    <div className="flex flex-col gap-6">
      <BookingsHeader />
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
