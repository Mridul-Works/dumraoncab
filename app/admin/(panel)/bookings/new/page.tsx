import type { Metadata } from "next";
import { Suspense } from "react";
import NewBookingForm from "@/components/admin/NewBookingForm";
import type { CarClassOption, CustomerInfo, RouteOption, ServiceOption } from "@/components/admin/NewBookingParts";
import SavedToast from "@/components/admin/SavedToast";
import { requireAdmin } from "@/lib/adminAuth";
import { istDate, istTime, phoneDigits } from "@/lib/bookingTypes";
import { getFares } from "@/lib/fares";
import { listCars } from "@/lib/fleet";
import { routes, services } from "@/lib/site";
import { listBookings } from "@/lib/store";

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

// "≈ 3 hr" → 180, "≈ 50 min" → 50, "≈ 1.5 hr" → 90
function minutes(duration: string): number {
  const n = Number(duration.match(/[\d.]+/)?.[0] ?? 0);
  return /hr|hour/i.test(duration) ? Math.round(n * 60) : Math.round(n);
}

const mostCommon = (list: string[]) => {
  const count = new Map<string, number>();
  for (const v of list) if (v) count.set(v, (count.get(v) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
};

export default async function NewBookingPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const [{ saved }, bookings, cars, fares] = await Promise.all([searchParams, listBookings(), listCars(), getFares()]);
  const today = istDate();

  // Past customers, one per phone number.
  const byPhone = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const key = phoneDigits(b.phone);
    if (key) byPhone.set(key, [...(byPhone.get(key) ?? []), b]);
  }
  const customers: CustomerInfo[] = [...byPhone.entries()].map(([digits, list]) => {
    const sorted = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const last = sorted[0];
    const first = sorted[sorted.length - 1];
    return {
      digits,
      name: sorted.find((b) => b.name)?.name ?? "",
      trips: list.length,
      since: first.createdAt.slice(0, 10),
      last: { date: last.date, from: last.from, to: last.to, car: last.car },
      usualPickup: mostCommon(list.map((b) => b.from)),
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
    minutes: minutes(r.duration),
  }));

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

  // Cars already promised to a live booking, per travel date.
  const busy: Record<string, string[]> = {};
  for (const b of bookings) {
    if (!b.carId || !b.date || b.date < today || b.status === "completed" || b.status === "cancelled") continue;
    (busy[b.date] ??= []).push(b.carId);
  }

  return (
    <>
      <NewBookingForm
        key={saved ?? "new"}
        customers={customers}
        services={serviceOptions}
        routes={routeOptions}
        classes={classes}
        cars={cars.map((c) => ({ id: c.id, name: c.name, number: c.number, fareClass: c.fareClass }))}
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
