import type { Metadata } from "next";
import { Suspense } from "react";
import NewBookingForm from "@/components/admin/NewBookingForm";
import type { CarClassOption, CustomerInfo, PlaceOption, RouteOption, ServiceOption, VendorCarOption } from "@/components/admin/NewBookingParts";
import { durationMin } from "@/components/admin/newbooking/format";
import SavedToast from "@/components/admin/SavedToast";
import { requireAdmin } from "@/lib/adminAuth";
import { istDate, istTime, phoneDigits } from "@/lib/bookingTypes";
import { getFares } from "@/lib/fares";
import { listCars } from "@/lib/fleet";
import { routes, services } from "@/lib/site";
import { listBookings } from "@/lib/store";
import { listApprovedVendors } from "@/lib/vendors";

export const metadata: Metadata = { title: "New booking" };

// Trip-type tabs from the design, in design order, mapped to our services.
const SERVICE_TABS: { slug: string; label: string; icon: string }[] = [
  { slug: "airport-transfers", label: "Airport", icon: "airplane-tilt" },
  { slug: "outstation-trips", label: "Outstation", icon: "path" },
  { slug: "hourly-rental", label: "Hourly", icon: "clock" },
  { slug: "one-way-drops", label: "One-way", icon: "arrow-right" },
  { slug: "wedding-cars", label: "Wedding", icon: "heart" },
  { slug: "corporate-rental", label: "Company", icon: "briefcase" },
];

// Values ordered by how often they occur, most used first.
const byUse = (list: string[]) => {
  const count = new Map<string, number>();
  for (const v of list.map((s) => s.trim())) if (v) count.set(v, (count.get(v) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
};

export default async function NewBookingPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const [{ saved }, bookings, cars, fares, vendors] = await Promise.all([searchParams, listBookings(), listCars(), getFares(), listApprovedVendors()]);
  const today = istDate();

  // Past customers, one per phone number (Figma 3B.8).
  const byPhone = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const key = phoneDigits(b.phone);
    if (key) byPhone.set(key, [...(byPhone.get(key) ?? []), b]);
  }
  const customers: CustomerInfo[] = [...byPhone.entries()].map(([digits, list]) => {
    const sorted = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const last = sorted[0];
    const first = sorted[sorted.length - 1];
    const pickups = byUse(list.map((b) => b.from));
    return {
      digits,
      name: sorted.find((b) => b.name)?.name ?? "",
      trips: list.length,
      since: first.createdAt.slice(0, 10),
      last: { date: last.date, from: last.from, to: last.to, car: last.car },
      usualPickup: pickups[0] ?? "",
      usualDrop: byUse(list.map((b) => b.to))[0] ?? "",
      usualTime: byUse(list.map((b) => b.time).filter((t) => /^\d{2}:\d{2}$/.test(t)))[0] ?? "",
      places: pickups.slice(0, 3),
      payment: last.adminNote?.match(/Payment: ([A-Za-z ]+)/)?.[1]?.trim() ?? "",
    };
  });

  const serviceOptions: ServiceOption[] = SERVICE_TABS.flatMap((t) => {
    const s = services.find((x) => x.slug === t.slug);
    return s ? [{ ...t, name: s.name }] : [];
  });

  const routeOptions: RouteOption[] = routes.map((r) => ({
    slug: r.slug,
    from: r.from,
    to: r.to,
    fare: fares.routes[r.slug] ?? 0,
    km: Number(r.distance.match(/\d+/)?.[0] ?? 0),
    minutes: durationMin(r.duration),
  }));

  // Pickup suggestions (Figma 3B.9): the most used pickups; drop suggestions
  // (3B.10) add past drops to the fixed-fare routes.
  const pickups: PlaceOption[] = byUse([...bookings.map((b) => b.from), ...routes.map((r) => r.from)])
    .slice(0, 12)
    .map((name) => ({ name }));
  const drops: PlaceOption[] = byUse(bookings.map((b) => b.to))
    .filter((name) => !routes.some((r) => r.to.toLowerCase() === name.toLowerCase()))
    .slice(0, 20)
    .map((name) => ({ name }));

  const classes: CarClassOption[] = fares.perKm.map((c) => {
    const inClass = cars.filter((car) => car.fareClass === c.id);
    return {
      id: c.id,
      name: c.name,
      rate: c.rate,
      seats: Math.max(0, ...inClass.map((car) => Number(car.seats.match(/\d+/)?.[0] ?? 0))),
      carIds: inClass.map((car) => car.id),
    };
  });

  // Approved vendors' cars: offered only when none of ours are free (3B.13).
  const vendorCars: VendorCarOption[] = vendors.flatMap((v) =>
    v.cars.map((c) => ({ key: `${v.id}:${c.id}`, vendor: v.name, model: c.model, number: c.number, type: c.type, seats: c.seats })),
  );

  // Cars already promised to a live booking, per travel date.
  const busy: Record<string, string[]> = {};
  for (const b of bookings) {
    if (!b.date || b.date < today || b.status === "completed" || b.status === "cancelled") continue;
    if (b.carId) (busy[b.date] ??= []).push(b.carId);
    if (b.vendorId && b.vendorCarId) (busy[b.date] ??= []).push(`${b.vendorId}:${b.vendorCarId}`);
  }

  return (
    <>
      <NewBookingForm
        key={saved ?? "new"}
        customers={customers}
        services={serviceOptions}
        routes={routeOptions}
        pickups={pickups}
        drops={drops}
        classes={classes}
        cars={cars.map((c) => ({ id: c.id, name: c.name, number: c.number, fareClass: c.fareClass }))}
        vendorCars={vendorCars}
        busy={busy}
        nightAllowance={fares.nightAllowance}
        today={today}
        startedAt={istTime()}
      />
      <Suspense>
        <SavedToast />
      </Suspense>
    </>
  );
}
