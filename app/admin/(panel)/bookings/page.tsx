import type { Metadata } from "next";
import BookingsManager from "@/components/admin/BookingsManager";
import NewBookingForm from "@/components/admin/NewBookingForm";
import { PageHeader, btnGhost } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/adminAuth";
import { fleet, services } from "@/lib/site";
import { listBookings } from "@/lib/store";

export const metadata: Metadata = { title: "Bookings" };

export default async function BookingsPage() {
  await requireAdmin();
  const bookings = await listBookings();

  return (
    <>
      <PageHeader
        title="Bookings"
        intro="Every request from the website widget and booking form, plus trips you log by hand. Change status as you confirm trips."
      >
        {/* Plain link: a route handler download, not a client navigation. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/bookings/export" className={btnGhost}>
          Export CSV
        </a>
      </PageHeader>
      <div className="mt-6">
        <NewBookingForm services={[...services.map((s) => s.name), "Other"]} cars={fleet.map((v) => v.name)} />
      </div>
      <div className="mt-6">
        <BookingsManager bookings={bookings} />
      </div>
    </>
  );
}
