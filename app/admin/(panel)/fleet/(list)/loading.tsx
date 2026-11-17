import Link from "next/link";
import FleetHeader from "@/components/admin/FleetHeader";
import Icon from "@/components/admin/Icon";
import { btnPrimary } from "@/components/admin/ui";

// Figma 4.11 "Fleet · loading": real header (Add car stays usable, no
// spinner), skeleton type tabs and nine skeleton car cards laid out like the
// real ones (photo, name + rate, meta, switch + label + Edit). Bar sizes are
// the design's. Lives in the (list) group so add/edit keep the panel skeleton.

// [label, count] bar widths per tab; the first is the selected "All cars" pill.
const TABS = [
  ["w-[50px]", "w-[9px]"],
  ["w-7", "w-2"],
  ["w-[33px]", "w-2"],
  ["w-[95px]", "w-2"],
  ["w-[74px]", "w-2"],
  ["w-10", "w-2"],
];
// [rate, meta] bar widths per card.
const CARDS = [
  ["w-[47px]", "w-[194px]"],
  ["w-[47px]", "w-[194px]"],
  ["w-[47px]", "w-[194px]"],
  ["w-[47px]", "w-[198px]"],
  ["w-[49px]", "w-[220px]"],
  ["w-[46px]", "w-[220px]"],
  ["w-[46px]", "w-[220px]"],
  ["w-[46px]", "w-[220px]"],
  ["w-[77px]", "w-[200px]"],
];

const bar = "h-3 min-w-0 shrink rounded-full bg-gray-100";

export default function FleetLoading() {
  return (
    <div role="status" aria-label="Loading your cars" className="flex flex-col gap-6">
      <FleetHeader back={false} title="Fleet" intro="Loading your cars…">
        <Link href="/admin/fleet/new" className={btnPrimary}>
          <Icon name="plus" size={16} />
          Add car
        </Link>
      </FleetHeader>

      <div className="flex max-w-full gap-1 self-start overflow-hidden rounded-full border border-gray-100 bg-layer p-1">
        {TABS.map(([label, count], i) => (
          <span key={i} className={`flex h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3.5 ${i === 0 ? "bg-layer-selected" : ""}`}>
            <span className={`${bar} ${label}`} />
            <span className={`${bar} ${count}`} />
          </span>
        ))}
      </div>

      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {CARDS.map(([rate, meta], i) => (
          <li key={i} className="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-layer">
            <div className="h-[170px] bg-layer-accent" />
            <div className="flex flex-col gap-1.5 px-[18px] py-4">
              <div className="flex h-6 items-center gap-2">
                <span className={`${bar} w-[220px] max-w-[65%]`} />
                <span className={`${bar} ${rate} ml-auto`} />
              </div>
              <div className="flex h-5 items-center">
                <span className={`${bar} ${meta}`} />
              </div>
            </div>
            <div className="flex items-center gap-2.5 border-t border-gray-100 px-[18px] py-3">
              <span className="h-5 w-9 shrink-0 rounded-full bg-gray-100" />
              <span className={`${bar} w-[220px]`} />
              <span className="flex-1" />
              <span className="h-10 w-[35px] shrink-0 rounded-[10px] bg-gray-100" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
