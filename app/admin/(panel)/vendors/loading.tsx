import Link from "next/link";
import Icon from "@/components/admin/Icon";
import { btnPrimary } from "@/components/admin/ui";

// Figma 6.21 Vendors · loading — grey shapes where the notice, tabs, search and
// rows will be. The title and Add vendor stay real so staff can start adding
// someone straight away. Child pages (vendor, add, edit) have their own.

const bar = "rounded-full bg-gray-100";
// Same columns as the table in VendorList.
const COLS = "lg:grid-cols-[minmax(0,230fr)_minmax(0,280fr)_80px_50px_110px_minmax(240px,1fr)]";
// Name widths vary a little so the rows read as a list, not a block.
const NAMES = ["w-[180px]", "w-[110px]", "w-[130px]", "w-[150px]", "w-[140px]", "w-[165px]", "w-[150px]", "w-[145px]"];

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
        {NAMES.map((name, i) => (
          <div key={i} className={`grid grid-cols-1 gap-x-4 gap-y-2 border-b border-gray-100 px-5 py-[18px] last:border-b-0 lg:items-center ${COLS}`}>
            <Bar className={`h-3 max-w-full ${name}`} />
            <div className="flex flex-col gap-2.5">
              <Bar className="h-3 w-[220px] max-w-full" />
              <Bar className="h-3 w-[107px]" />
            </div>
            <Bar className={`h-3 ${i % 3 === 2 ? "w-5" : "w-[62px]"}`} />
            <Bar className="h-3 w-3" />
            <Bar className="h-7 w-[98px]" />
            <div className="flex items-center gap-2 lg:justify-end">
              {i === 0 ? (
                <>
                  <Bar className="h-10 w-[98px]" />
                  <Bar className="h-10 w-[83px]" />
                </>
              ) : (
                <Bar className={`h-[42px] ${i === 3 ? "w-[114px]" : "w-[102px]"}`} />
              )}
              <span className="block size-9 rounded-md bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
