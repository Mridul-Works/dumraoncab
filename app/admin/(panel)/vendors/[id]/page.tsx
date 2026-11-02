import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import VendorDetail from "@/components/admin/vendors/VendorDetail";
import { requireAdmin } from "@/lib/adminAuth";
import { istDate } from "@/lib/bookingTypes";
import { listBookings } from "@/lib/store";
import { getVendor } from "@/lib/vendors";
import { upcomingByVendor } from "../data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const vendor = await getVendor((await params).id);
  return { title: vendor ? vendor.name : "Vendor not found" };
}

// Figma 6.2 Vendor detail (+ 6.6–6.11, 6.16, 6.17).
export default async function VendorPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const [vendor, bookings] = await Promise.all([getVendor(id), listBookings()]);
  if (!vendor) notFound();

  // "Bookings DC-… moved to …" from the latest suspension, for the banner.
  const lastSuspend = [...(vendor.history ?? [])].reverse().find((e) => e.text.startsWith("Suspended by"));
  const suspendNote = lastSuspend?.text.match(/(Bookings? .+)$/)?.[1] ?? "";

  return (
    <Suspense>
      <VendorDetail vendor={vendor} upcoming={upcomingByVendor(bookings)[vendor.id] ?? []} today={istDate()} suspendNote={suspendNote} />
    </Suspense>
  );
}
