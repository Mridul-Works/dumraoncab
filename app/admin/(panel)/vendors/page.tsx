import type { Metadata } from "next";
import { Suspense } from "react";
import VendorList from "@/components/admin/vendors/VendorList";
import { requireAdmin } from "@/lib/adminAuth";
import { istDate } from "@/lib/bookingTypes";
import { site, vendorPartnerPath } from "@/lib/site";
import { listBookings } from "@/lib/store";
import { listVendors, type Vendor } from "@/lib/vendors";
import { upcomingByVendor } from "./data";

export const metadata: Metadata = { title: "Vendors" };

// Figma Flow 6 · 6.1 Vendors (+ empty, no results, caught up, couldn't load).
export default async function VendorsPage() {
  await requireAdmin();
  let vendors: Vendor[] = [];
  let upcoming = {};
  let failed = false;
  try {
    const [v, bookings] = await Promise.all([listVendors(), listBookings()]);
    vendors = v;
    upcoming = upcomingByVendor(bookings);
  } catch (err) {
    console.error("Vendors: could not read the store", err);
    failed = true;
  }

  return (
    <Suspense>
      <VendorList vendors={vendors} upcoming={upcoming} today={istDate()} failed={failed} partnerUrl={`${site.url}${vendorPartnerPath}`} />
    </Suspense>
  );
}
