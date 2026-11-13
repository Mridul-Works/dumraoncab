import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CarForm from "@/components/admin/CarForm";
import FleetHeader from "@/components/admin/FleetHeader";
import { requireAdmin } from "@/lib/adminAuth";
import { getFares } from "@/lib/fares";
import { bookingRef, fmtDay } from "@/components/admin/BookingFormat";
import { formSnapshot, getCar, upcomingTrips } from "@/lib/fleet";

type Props = { params: Promise<{ car: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const car = await getCar((await params).car);
  return { title: car ? `Edit ${car.name}` : "Car not found" };
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function EditCarPage({ params }: Props) {
  await requireAdmin();
  const id = (await params).car;
  const [car, fares, trips] = await Promise.all([getCar(id), getFares(), upcomingTrips(id)]);
  if (!car) notFound();

  const stamp = car.updatedAt ?? car.createdAt;
  // Figma 4.2: "Last updated 12 Oct 2026 by staff@dumraoncab.com"
  const intro = stamp ? `Last updated ${day(stamp)}${car.updatedBy ? ` by ${car.updatedBy}` : ""}` : "Changes go live on /fleet as soon as you save.";

  return (
    <div className="flex flex-col gap-6">
      <FleetHeader title={`Edit ${car.name}`} intro={intro} />
      {/* Re-keyed on each save so "Load the latest" (Figma 4.10) starts from the stored car. */}
      <CarForm
        key={car.updatedAt ?? car.createdAt ?? car.id}
        car={car}
        fareClasses={fares.perKm}
        base={JSON.stringify(formSnapshot(car))}
        trips={trips.map((b) => ({ id: b.id, label: `${bookingRef(b)} on ${fmtDay(b.date)}` }))}
      />
    </div>
  );
}
