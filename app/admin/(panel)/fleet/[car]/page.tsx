import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CarForm from "@/components/admin/CarForm";
import FleetHeader from "@/components/admin/FleetHeader";
import { requireAdmin } from "@/lib/adminAuth";
import { getFares } from "@/lib/fares";
import { getCar } from "@/lib/fleet";

type Props = { params: Promise<{ car: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const car = await getCar((await params).car);
  return { title: car ? `Edit ${car.name}` : "Car not found" };
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function EditCarPage({ params }: Props) {
  await requireAdmin();
  const [car, fares] = await Promise.all([getCar((await params).car), getFares()]);
  if (!car) notFound();

  const stamp = car.updatedAt ?? car.createdAt;
  const intro = [stamp ? `Last updated ${day(stamp)}` : "", car.number].filter(Boolean).join(" · ") || "Changes go live on /fleet as soon as you save.";

  return (
    <div className="flex flex-col gap-6">
      <FleetHeader title={`Edit ${car.name}`} intro={intro} />
      <CarForm car={car} fareClasses={fares.perKm} />
    </div>
  );
}
