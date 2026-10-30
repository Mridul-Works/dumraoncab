"use server";

import { requireAdmin } from "@/lib/adminAuth";
import { STATUS_LABELS } from "@/lib/bookingTypes";
import { carLabel } from "@/lib/catalogTypes";
import { listCars } from "@/lib/fleet";
import { listBookings } from "@/lib/store";

export type SearchItem = { group: "Bookings" | "Cars"; title: string; detail: string; href: string; haystack: string };

// ⌘K search: a compact index loaded when the palette opens, filtered in the browser.
export async function getSearchIndex(): Promise<SearchItem[]> {
  await requireAdmin();
  const [bookings, cars] = await Promise.all([listBookings(), listCars()]);

  return [
    ...bookings.slice(0, 500).map((b) => ({
      group: "Bookings" as const,
      title: `${b.name || "Unnamed"} · ${b.from}${b.to ? ` → ${b.to}` : ""}`,
      detail: `${STATUS_LABELS[b.status]} · ${b.date || "no date"}${b.phone ? ` · ${b.phone}` : ""}`,
      href: `/admin/bookings?id=${b.id}`,
      haystack: [b.name, b.phone, b.from, b.to, b.service, b.car, b.date].join(" ").toLowerCase(),
    })),
    ...cars.map((c) => ({
      group: "Cars" as const,
      title: carLabel(c),
      detail: `${c.type}${c.shown ? "" : " · hidden from site"}`,
      href: `/admin/fleet/${c.id}`,
      haystack: [c.name, c.number, c.number.replace(/\s/g, ""), c.type].join(" ").toLowerCase(),
    })),
  ];
}
