import { bookingRef, fmtClock, fmtDay, route } from "@/components/admin/BookingFormat";
import type { Upcoming } from "@/components/admin/vendors/VendorDialogs";
import { istDate, type Booking } from "@/lib/bookingTypes";

// Server-side helpers shared by the Vendors pages (not a route).

// Bookings still to run, grouped by the vendor they're assigned to — shown in
// the Suspend dialog ("2 upcoming bookings use these cars").
export function upcomingByVendor(bookings: Booking[]): Record<string, Upcoming[]> {
  const today = istDate();
  const out: Record<string, Upcoming[]> = {};
  const list = bookings
    .filter((b) => b.vendorId && b.status !== "completed" && b.status !== "cancelled" && (!b.date || b.date >= today))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  for (const b of list) {
    const when = [b.date ? fmtDay(b.date) : "", b.time ? fmtClock(b.time) : ""].filter(Boolean).join(", ") || "No date";
    (out[b.vendorId!] ??= []).push({ id: b.id, ref: bookingRef(b), when, route: route(b).replace(" → ", " to ") });
  }
  return out;
}
