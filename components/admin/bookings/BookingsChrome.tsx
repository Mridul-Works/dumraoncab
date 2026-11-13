import Link from "next/link";
import { bookingRef } from "@/components/admin/BookingFormat";
import Icon from "@/components/admin/Icon";
import { PageHeader, btnGhost, btnPrimary } from "@/components/admin/ui";
import { BOOKING_STATUSES, STATUS_LABELS, type BookingStatus } from "@/lib/bookingTypes";

// Pieces of the Bookings screen shared by the live list (BookingsManager), the
// loading skeleton (Figma 3.8) and the "Couldn't load" state (3.9), so all
// three line up pixel for pixel. Server-safe: no hooks.

export type StatusFilter = "all" | BookingStatus;
export const STATUS_FILTERS: StatusFilter[] = ["all", ...BOOKING_STATUSES];

// Grid columns shared by the table header and rows (Figma "Booking row":
// Customer 200, Trip 220, Pickup 110, Car 120, Source 130, Status 112, then
// the PDF + Share icon buttons).
export const BOOKING_COLS =
  "lg:grid-cols-[minmax(0,200fr)_minmax(0,220fr)_minmax(0,110fr)_minmax(0,120fr)_112px_76px] xl:grid-cols-[minmax(0,200fr)_minmax(0,220fr)_minmax(0,110fr)_minmax(0,120fr)_minmax(0,130fr)_112px_76px]";

// Figma "Segmented tabs" (status filter) and the pill-shaped filter controls.
export const tabBarCls = "flex max-w-full gap-1 overflow-x-auto rounded-full border border-gray-100 bg-layer p-1 [scrollbar-width:none]";
export const tabCls = (on: boolean) =>
  `flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.75 transition-colors ${on ? "bg-inverse" : "hover:bg-layer-hover"}`;
export const datePillCls = "relative flex shrink-0 items-center rounded-full border border-gray-200 bg-layer hover:bg-layer-hover";
export const searchPillCls =
  "flex min-w-0 flex-1 items-center gap-2 rounded-full bg-layer px-3.5 py-2.5 text-[var(--icon-secondary)] sm:w-60 sm:flex-none";

export function TabLabel({ filter, count, on }: { filter: StatusFilter; count?: number; on: boolean }) {
  return (
    <>
      <span className={`type-ui ${on ? "text-inverse" : "text-primary"}`}>{filter === "all" ? "All" : STATUS_LABELS[filter]}</span>
      {count !== undefined && <span className={`type-body-sm ${on ? "text-secondary-inverse" : "text-secondary"}`}>{count}</span>}
    </>
  );
}

// Page title + Export CSV + Add phone booking (same in every Bookings state).
export function BookingsHeader() {
  return (
    <PageHeader title="Bookings" intro="Requests from the website booking form and hero widget, newest first.">
      {/* Plain link: a route handler download, not a client navigation. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/api/bookings/export" className={btnGhost}>
        Export CSV
      </a>
      <Link href="/admin/bookings/new" className={btnPrimary}>
        <Icon name="plus" size={16} />
        Add phone booking
      </Link>
    </PageHeader>
  );
}

// Filters row while the list can't be used yet (loading, couldn't load):
// same controls, inert. `counts` omitted → tabs show labels only.
export function StaticFilters({ counts }: { counts?: Partial<Record<StatusFilter, number>> }) {
  return (
    <div className="flex flex-wrap items-center gap-3" aria-hidden="true">
      <div className={tabBarCls}>
        {STATUS_FILTERS.map((f) => (
          <span key={f} className={tabCls(f === "all")}>
            <TabLabel filter={f} on={f === "all"} count={counts ? (counts[f] ?? 0) : undefined} />
          </span>
        ))}
      </div>
      <span className="hidden flex-1 xl:block" />
      <span className={`${searchPillCls} border border-gray-200`}>
        <Icon name="magnifying-glass" size={16} />
        <span className="truncate type-body-sm text-secondary">Search name, phone or place</span>
      </span>
      <span className={datePillCls}>
        <span className="flex items-center gap-2 py-2.5 pl-3.5 pr-3 type-ui text-primary">
          Pickup: any date
          <Icon name="caret-down" size={16} className="text-[var(--icon-secondary)]" />
        </span>
      </span>
    </div>
  );
}

// Grey header strip of the bookings table (hidden below lg, where rows are cards).
export function BookingsTableHead() {
  return (
    <div className={`hidden gap-4 rounded-t-lg bg-layer-accent px-5 py-2.5 type-body-sm text-secondary lg:grid ${BOOKING_COLS}`}>
      <span>Customer</span>
      <span>Trip</span>
      <span>Pickup</span>
      <span>Car</span>
      <span className="hidden xl:block">Source</span>
      <span>Status</span>
      <span />
    </div>
  );
}

// Figma empty / problem states inside the table card: 3.4 no results, 3.5 none
// yet, 3.9 couldn't load, 3.10 booking not found.
const ART = {
  "no-bookings": { src: "/admin-illustrations/no-bookings.svg", w: 204, h: 136 },
  "no-search-results": { src: "/admin-illustrations/no-search-results.svg", w: 204, h: 136 },
  "couldnt-load": { src: "/admin-illustrations/publish-failed.svg", w: 192, h: 128 },
  "not-found": { src: "/admin-illustrations/page-not-found.svg", w: 192, h: 128 },
} as const;

export function BookingsEmpty({
  title,
  art,
  children,
  action,
  role,
}: {
  title: string;
  art: keyof typeof ART;
  children?: React.ReactNode;
  action?: React.ReactNode;
  role?: "alert" | "status";
}) {
  const a = ART[art];
  return (
    <div role={role} className="flex flex-col items-center gap-2.5 px-5 py-20 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- static line-art SVG from the design */}
      <img src={a.src} alt="" width={a.w} height={a.h} style={{ width: a.w, height: a.h }} className="max-w-full" />
      <p className="type-h4 text-primary">{title}</p>
      {children && <p className="max-w-3xl type-body-sm text-secondary">{children}</p>}
      {action && <div className="pt-1.5">{action}</div>}
    </div>
  );
}

// Figma 3.10: a ?id= link to a booking that was deleted (or never existed).
export function BookingNotFound({ id, action }: { id: string; action: React.ReactNode }) {
  return (
    <BookingsEmpty role="alert" art="not-found" title={`Booking ${bookingRef({ id })} isn’t here`} action={action}>
      It was deleted, or the link is old. Search by name or phone above to find the right booking.
    </BookingsEmpty>
  );
}
