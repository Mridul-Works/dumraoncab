"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { BookingsEmpty, BookingsHeader, BookingsTableHead, StaticFilters } from "@/components/admin/bookings/BookingsChrome";
import { btnPrimary, cardCls } from "@/components/admin/ui";

// Figma 3.9 "Bookings · couldn't load": the list failed to load (store or
// network down). Header and filters stay; the table card explains and retries.
export default function BookingsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col gap-6">
      <BookingsHeader />
      <StaticFilters counts={{}} />
      <div className={cardCls}>
        <BookingsTableHead />
        <BookingsEmpty
          role="alert"
          art="couldnt-load"
          title="Couldn’t load bookings"
          action={
            <button type="button" onClick={() => retry()} className={btnPrimary}>
              Try again
            </button>
          }
        >
          Check the internet connection and try again. Website requests are kept and show up once this loads.
        </BookingsEmpty>
      </div>
    </div>
  );
}
