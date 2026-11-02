import type { Metadata } from "next";
import VendorForm from "@/components/admin/vendors/VendorForm";
import { requireAdmin } from "@/lib/adminAuth";

export const metadata: Metadata = { title: "Add vendor" };

type Props = { searchParams: Promise<{ added?: string }> };

// Figma 6.3 Add vendor (6.4 missing info, 6.18 Add place). ?added=<name> after
// "Save and add another" shows a toast for the vendor just saved.
export default async function NewVendorPage({ searchParams }: Props) {
  await requireAdmin();
  const { added } = await searchParams;
  return <VendorForm key={added ?? "new"} added={typeof added === "string" ? added.slice(0, 80) : undefined} />;
}
