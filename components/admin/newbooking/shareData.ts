import type { ShareData } from "@/components/admin/newbooking/ShareMenu";
import { bookingExtras, bookingRef, clock, dayShort } from "@/components/admin/newbooking/format";
import { phoneDigits, type Booking } from "@/lib/bookingTypes";
import { customerConfirmText, customerQuoteText, driverTripText } from "@/lib/site";

// What the Figma share menu (3B.6) needs for one booking. Browser- and
// server-safe, so the bookings list rows and the "Booking saved" page build it
// the same way.
export function shareDataFor(b: Booking): ShareData {
  const x = bookingExtras(b.notes, b.adminNote);
  const ref = bookingRef(b.id);
  const when = [dayShort(b.date), b.time ? clock(b.time) : ""].filter(Boolean);
  const trip = { name: b.name, service: b.service, from: b.from, to: b.to, date: dayShort(b.date), time: b.time ? clock(b.time) : "", car: b.car };
  const message = b.status === "confirmed" ? customerConfirmText : customerQuoteText;
  return {
    id: b.id,
    refLabel: ref,
    name: b.name,
    phone: phoneDigits(b.phone),
    customerText: { withFare: message({ ...trip, quote: b.quote }), withoutFare: message(trip) },
    driverText: driverTripText({ ref, name: b.name, phone: b.phone, from: b.from, to: b.to, when: when.join(", "), car: b.car, people: b.people, note: x.note }),
    driverPhone: b.driverMobile ? phoneDigits(b.driverMobile) : undefined,
  };
}
