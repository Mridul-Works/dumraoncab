import { BOOKING_COLS, BookingsHeader, BookingsTableHead, StaticFilters } from "@/components/admin/bookings/BookingsChrome";
import { cardCls } from "@/components/admin/ui";

// Figma 3.8 "Bookings · loading": the real header, filters and table head with
// grey placeholder bars where the numbers and rows will land.
const bar = "rounded-full bg-gray-100";
// Status pill widths vary a little, like real badges.
const STATUS_W = ["w-16", "w-16", "w-22", "w-22", "w-20", "w-22", "w-23", "w-21"];

export default function BookingsLoading() {
  return (
    <div role="status" aria-label="Loading bookings" className="flex flex-col gap-6">
      <BookingsHeader />
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-layer p-5">
            <div className={`h-2.5 w-3/5 ${bar}`} />
            <div className={`h-2.5 w-7 ${bar}`} />
            <div className={`h-2.5 w-1/2 ${bar}`} />
          </div>
        ))}
      </div>
      <StaticFilters />
      <div className={cardCls}>
        <BookingsTableHead />
        <ul>
          {STATUS_W.map((w, i) => (
            <li key={i} className="border-b border-gray-100 last:border-b-0">
              <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-4 lg:gap-y-0 ${BOOKING_COLS}`}>
                <span className="flex flex-col gap-1.5">
                  <span className={`h-2.5 w-1/2 ${bar}`} />
                  <span className={`h-2.5 w-full ${bar}`} />
                </span>
                <span className={`h-7 rounded-full bg-gray-100 lg:hidden ${w}`} />
                <span className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
                  <span className={`h-2.5 w-full ${bar}`} />
                  <span className={`h-2.5 w-full ${bar}`} />
                </span>
                <span className="hidden flex-col gap-1.5 lg:flex">
                  <span className={`h-2.5 w-full ${bar}`} />
                  <span className={`h-2.5 w-full ${bar}`} />
                </span>
                <span className={`hidden h-2.5 w-full lg:block ${bar}`} />
                <span className={`hidden h-2.5 w-full xl:block ${bar}`} />
                <span className={`hidden h-7 rounded-full bg-gray-100 lg:block ${w}`} />
                <span className="hidden justify-self-end gap-1 lg:flex">
                  <span className="size-9 rounded-md bg-gray-100" />
                  <span className="size-9 rounded-md bg-gray-100" />
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <span className="sr-only">Loading bookings…</span>
    </div>
  );
}
