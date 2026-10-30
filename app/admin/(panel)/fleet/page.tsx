import type { Metadata } from "next";
import Link from "next/link";
import FleetGrid from "@/components/admin/FleetGrid";
import FleetToast from "@/components/admin/FleetToast";
import Icon from "@/components/admin/Icon";
import { PageHeader, btnPrimary } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/adminAuth";
import { istDate } from "@/lib/bookingTypes";
import { rateForCar, serviceState } from "@/lib/catalogTypes";
import { getFares } from "@/lib/fares";
import { listCars } from "@/lib/fleet";
import { listEntries } from "@/lib/journal";
import { listBookings } from "@/lib/store";

export const metadata: Metadata = { title: "Fleet" };

type Props = { searchParams: Promise<{ saved?: string; deleted?: string }> };

export default async function FleetPage({ searchParams }: Props) {
  await requireAdmin();
  const [cars, fares, entries, bookings, query] = await Promise.all([listCars(), getFares(), listEntries(), listBookings(), searchParams]);
  const today = istDate();
  const outToday = new Set([
    ...bookings.filter((b) => b.date === today && b.carId && (b.status === "new" || b.status === "contacted" || b.status === "confirmed")).map((b) => b.carId as string),
    ...entries.filter((e) => e.date === today).map((e) => e.carId),
  ]);

  // Toast after a save or delete (set by the car form's redirect).
  const saved = query.saved ? cars.find((c) => c.id === query.saved) : undefined;
  const toast = saved
    ? `${saved.name} saved · ${saved.shown ? "live on /fleet" : "hidden from /fleet"}`
    : query.deleted
      ? `${query.deleted.slice(0, 60)} deleted · removed from /fleet`
      : "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Fleet" intro={`${cars.length} ${cars.length === 1 ? "car" : "cars"}. Changes go live on /fleet, the home page and the booking form.`}>
        <Link href="/admin/fleet/new" className={btnPrimary}>
          <Icon name="plus" size={16} />
          Add car
        </Link>
      </PageHeader>
      <FleetGrid
        cars={cars.map((c) => ({
          ...c,
          rate: rateForCar(c, fares),
          service: serviceState(c, entries, today),
          outToday: outToday.has(c.id),
        }))}
      />
      {toast && <FleetToast key={toast} message={toast} />}
    </div>
  );
}
