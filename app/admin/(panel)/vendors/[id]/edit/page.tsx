import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VendorForm from "@/components/admin/vendors/VendorForm";
import { requireAdmin } from "@/lib/adminAuth";
import { getVendor } from "@/lib/vendors";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ addCar?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const vendor = await getVendor((await params).id);
  return { title: vendor ? `Edit ${vendor.name}` : "Vendor not found" };
}

// Edit vendor: the Add vendor form, filled in. ?addCar=1 (from "Add car") opens a blank car.
export default async function EditVendorPage({ params, searchParams }: Props) {
  await requireAdmin();
  const [{ id }, { addCar }] = await Promise.all([params, searchParams]);
  const vendor = await getVendor(id);
  if (!vendor) notFound();
  return <VendorForm vendor={vendor} addCar={addCar === "1"} />;
}
