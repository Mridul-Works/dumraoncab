import type { Metadata } from "next";
import CompanyForm from "@/components/admin/company/CompanyForm";
import { requireAdmin } from "@/lib/adminAuth";
import { getCompany } from "@/lib/company";
import { listBookings } from "@/lib/store";

export const metadata: Metadata = { title: "Company profile" };

// /admin/company — Figma Flow 8 (Company profile under the staff card).
export default async function CompanyPage() {
  await requireAdmin();
  const [company, bookings] = await Promise.all([getCompany(), listBookings()]);
  // "View PDF" in the saved toast opens the latest confirmed booking, where its PDF lives.
  const latest = bookings.find((b) => b.status === "confirmed" || b.status === "completed");

  return <CompanyForm company={company} latestBookingId={latest?.id} />;
}
