"use server";

import { requireAdmin } from "@/lib/adminAuth";
import type { BookingStatus } from "@/lib/bookingTypes";
import { entryNet, inr } from "@/lib/catalogTypes";
import { listCars } from "@/lib/fleet";
import { listEntries } from "@/lib/journal";
import { listBookings } from "@/lib/store";
import { listVendors } from "@/lib/vendors";
import { bookingRef, fmtTime } from "@/components/admin/BookingFormat";

export type SearchGroup = "Bookings" | "Drivers and cars" | "Trip log";

export type SearchItem = {
  group: SearchGroup;
  icon: string; // admin icon name
  title: string;
  detail: string;
  href: string;
  status?: BookingStatus; // bookings show their status badge
  haystack: string; // lower-case text the query is matched against
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-11-02" → "Mon 2 Nov"; add the weekday only when asked.
function day(d: string, withWeekday = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const [y, m, dd] = d.split("-").map(Number);
  const label = `${dd} ${MONTHS[m - 1]}`;
  return withWeekday ? `${DAYS[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()]} ${label}` : label;
}

const lower = (...parts: (string | number | undefined)[]) => parts.filter(Boolean).join(" ").toLowerCase();

// Quick search (Figma 2.4): a compact index loaded when the search opens and
// filtered in the browser — bookings, drivers and cars, and the Trip log.
export async function getSearchIndex(): Promise<SearchItem[]> {
  await requireAdmin();
  const [bookings, cars, vendors, entries] = await Promise.all([listBookings(), listCars(), listVendors(), listEntries()]);
  const carName = new Map(cars.map((c) => [c.id, c.name]));

  return [
    ...bookings.slice(0, 500).map((b) => {
      const when = b.date ? `${day(b.date, true)}${b.time ? `, ${fmtTime(b.time).replace(/^0/, "")}` : ""}` : "No date";
      const where = b.to ? `${b.from} to ${b.to}` : b.from;
      return {
        group: "Bookings" as const,
        icon: "calendar-check",
        title: b.name || "Unnamed",
        detail: [bookingRef(b), when, where].filter(Boolean).join(" · "),
        href: `/admin/bookings?id=${b.id}`,
        status: b.status,
        haystack: lower(b.name, b.phone, b.phone.replace(/\D/g, ""), b.from, b.to, b.service, b.car, b.date, bookingRef(b), b.driverName),
      };
    }),
    ...vendors.map((v) => {
      const car = v.cars[0];
      return {
        group: "Drivers and cars" as const,
        icon: "car-simple-18",
        title: v.name,
        detail: [v.kind === "driver" ? "Driver" : "Car owner", car?.model, car?.number].filter(Boolean).join(" · "),
        href: `/admin/vendors/${v.id}`,
        haystack: lower(v.name, v.mobile, v.mobile.replace(/\D/g, ""), v.code, ...v.cars.flatMap((c) => [c.model, c.number, c.number.replace(/\s/g, "")])),
      };
    }),
    ...cars.map((c) => ({
      group: "Drivers and cars" as const,
      icon: "car-simple-18",
      title: c.name,
      detail: ["Our car", c.number, c.type, c.shown ? "" : "hidden from site"].filter(Boolean).join(" · "),
      href: `/admin/fleet/${c.id}`,
      haystack: lower(c.name, c.number, c.number.replace(/\s/g, ""), c.type),
    })),
    ...entries.slice(0, 500).map((e) => ({
      group: "Trip log" as const,
      icon: "notebook-18",
      title: [e.customer || "Trip", e.to ? `${e.to} drop` : ""].filter(Boolean).join(" · "),
      detail: `Trip entry · ${day(e.date)} · net ${inr(entryNet(e))}`,
      href: `/admin/journal?entry=${e.id}`,
      haystack: lower(e.customer, e.phone, e.from, e.to, e.note, carName.get(e.carId), e.date),
    })),
  ];
}
