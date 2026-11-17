import Link from "next/link";
import Icon from "@/components/admin/Icon";
import { btnPrimary } from "@/components/admin/ui";

// Figma 6.21 Vendors · loading — grey shapes where the notice, tabs, search and
// rows will be. The title and Add vendor stay real so staff can start adding
// someone straight away. Child pages (vendor, add, edit) have their own.

const bar = "rounded-full bg-gray-100";
// Same columns as the table in VendorList.
const COLS = "lg:grid-cols-[minmax(0,230fr)_minmax(0,280fr)_80px_50px_110px_minmax(240px,1fr)]";
// One entry per Figma skeleton row: name, Owner/Driver tag, phone, rating,
// trips and status widths, plus which buttons the row holds.
type Row = { name: number; tag: number; phone: number; rating: number; trips: number; status: number; actions: "approve" | "suspend" | "reactivate" };
const ROWS: Row[] = [
  { name: 152, tag: 46, phone: 107, rating: 62, trips: 11, status: 87, actions: "approve" },
  { name: 74, tag: 46, phone: 109, rating: 62, trips: 11, status: 98, actions: "suspend" },
  { name: 99, tag: 46, phone: 109, rating: 20, trips: 16, status: 98, actions: "suspend" },
  { name: 126, tag: 41, phone: 110, rating: 62, trips: 11, status: 107, actions: "reactivate" },
  { name: 108, tag: 46, phone: 107, rating: 62, trips: 11, status: 98, actions: "suspend" },
  { name: 136, tag: 46, phone: 106, rating: 62, trips: 11, status: 98, actions: "suspend" },
  { name: 116, tag: 46, phone: 105, rating: 20, trips: 10, status: 98, actions: "suspend" },
  { name: 111, tag: 46, phone: 110, rating: 20, trips: 16, status: 98, actions: "suspend" },
];

function Bar({ className }: { className: string }) {
  return <span className={`block ${bar} ${className}`} />;
}

export default function VendorsLoading() {
  return (
    <div role="status" aria-label="Loading vendors" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <h1 className="type-h2 text-primary">Vendors</h1>
          <p className="mt-1 type-body-sm text-secondary">Loading vendors…</p>
        </div>
        <Link href="/admin/vendors/new" className={btnPrimary}>
          <Icon name="plus" size={16} />
          Add vendor
        </Link>
      </div>

      <div aria-hidden="true" className="flex items-center gap-3 rounded-lg border border-gray-100 bg-layer px-4 py-3.5">
        <Bar className="size-5" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Bar className="h-3 w-[211px] max-w-full" />
          <Bar className="h-3 w-[220px] max-w-full" />
        </div>
        <Bar className="hidden h-[42px] w-[139px] sm:block" />
      </div>

      <div aria-hidden="true" className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex shrink-0 gap-1 overflow-x-auto rounded-full border border-gray-100 bg-layer p-1">
          {[18, 56, 68, 77, 61].map((w, i) => (
            <span key={i} className="flex shrink-0 items-center gap-1.5 px-3.5 py-[11px]">
              <span className={`block h-3 ${bar}`} style={{ width: w }} />
              <span className={`block h-3 w-2.5 ${bar}`} />
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-gray-200 bg-layer px-3.5 py-[13px]">
          <Bar className="size-4" />
          <Bar className="h-3 w-[214px] max-w-full" />
        </div>
      </div>

      <div aria-hidden="true" className="overflow-hidden rounded-lg border border-gray-100 bg-layer">
        <div className={`hidden gap-4 bg-layer-accent px-5 py-3.5 lg:grid ${COLS}`}>
          <Bar className="h-3 w-[220px] max-w-full" />
          <Bar className="h-3 w-[220px] max-w-full" />
          <Bar className="h-3 w-[80px] max-w-full" />
          <Bar className="h-3 w-[50px] max-w-full" />
          <Bar className="h-3 w-[110px] max-w-full" />
          <Bar className="ml-auto h-3 w-[220px] max-w-full" />
        </div>
        {ROWS.map((r, i) => (
          <div key={i} className={`grid grid-cols-1 gap-x-4 gap-y-2 border-b border-gray-100 px-5 py-3.5 last:border-b-0 lg:items-center ${COLS}`}>
            <div className="flex h-6 items-center gap-2">
              <span className={`block h-3 max-w-full ${bar}`} style={{ width: r.name }} />
              <span className={`ml-2 block h-3 ${bar}`} style={{ width: r.tag }} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="flex h-6 items-center">
                <Bar className="h-3 w-[220px] max-w-full" />
              </span>
              <span className="flex h-5 items-center">
                <span className={`block h-3 ${bar}`} style={{ width: r.phone }} />
              </span>
            </div>
            <span className={`block h-3 ${bar}`} style={{ width: r.rating }} />
            <span className={`block h-3 ${bar}`} style={{ width: r.trips }} />
            <span className={`block h-7 ${bar}`} style={{ width: r.status }} />
            <div className="flex items-center gap-2 lg:justify-end">
              {r.actions === "approve" ? (
                <>
                  <Bar className="h-10 w-[98px]" />
                  <Bar className="h-10 w-[83px]" />
                </>
              ) : (
                <Bar className={`h-[42px] ${r.actions === "reactivate" ? "w-[114px]" : "w-[102px]"}`} />
              )}
              <span className="block size-9 rounded-md bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
