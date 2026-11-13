import Link from "next/link";
import Icon from "@/components/admin/Icon";
import { PageHeader, btnPrimary } from "@/components/admin/ui";

// Figma 4.11 "Fleet · loading": real header, skeleton type tabs and nine
// skeleton car cards (photo, name + rate, meta, switch + label + Edit).
// Lives in the (list) group so the add/edit pages keep the panel skeleton.
export default function FleetLoading() {
  const bar = "rounded-full bg-gray-100";
  const tabs = ["w-7", "w-7", "w-16", "w-12", "w-8"];
  const widths = ["w-[62%]", "w-[52%]", "w-[58%]"];

  return (
    <div role="status" aria-label="Loading your cars" className="flex flex-col gap-6">
      <PageHeader title="Fleet" intro="Loading your cars…">
        <Link href="/admin/fleet/new" className={btnPrimary}>
          <Icon name="plus" size={16} />
          Add car
        </Link>
      </PageHeader>

      <div className="flex max-w-full items-center gap-1 self-start overflow-hidden rounded-full border border-gray-100 bg-layer p-1">
        <span className="h-[34px] w-[66px] shrink-0 rounded-full bg-gray-100" />
        {tabs.map((w, i) => (
          <span key={i} className="flex shrink-0 items-center gap-1.5 px-3.5 py-[7px]">
            <span className={`h-2.5 ${w} ${bar}`} />
            <span className={`h-2.5 w-1.5 ${bar}`} />
          </span>
        ))}
      </div>

      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }, (_, i) => (
          <li key={i} className="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-layer">
            <div className="h-[170px] bg-layer-accent" />
            <div className="flex flex-col gap-3 px-[18px] py-[18px]">
              <div className="flex items-center gap-8">
                <span className={`h-2.5 flex-1 ${bar}`} />
                <span className={`h-2.5 w-[13%] ${bar}`} />
              </div>
              <span className={`h-2.5 ${widths[i % 3]} ${bar}`} />
            </div>
            <div className="flex items-center gap-2.5 border-t border-gray-100 px-[18px] py-3">
              <span className={`h-3.5 w-9 shrink-0 ${bar}`} />
              <span className={`h-2.5 flex-1 ${bar}`} />
              <span className="ml-3 size-9 shrink-0 rounded-md bg-gray-100" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
