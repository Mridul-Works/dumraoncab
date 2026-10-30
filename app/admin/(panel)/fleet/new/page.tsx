import type { Metadata } from "next";
import CarForm from "@/components/admin/CarForm";
import FleetHeader from "@/components/admin/FleetHeader";
import { requireAdmin } from "@/lib/adminAuth";
import { getFares } from "@/lib/fares";

export const metadata: Metadata = { title: "Add car" };

export default async function AddCarPage() {
  await requireAdmin();
  const fares = await getFares();
  return (
    <div className="flex flex-col gap-6">
      <FleetHeader title="Add a car" intro="New cars appear on the site as soon as you save." />
      <CarForm fareClasses={fares.perKm} />
    </div>
  );
}
