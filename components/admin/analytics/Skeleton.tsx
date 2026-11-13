import { cardCls } from "@/components/admin/ui";

// Analytics loading state (Figma 7.8): the page's cards with grey bars in
// place of the numbers. Same grid as the loaded page so nothing jumps.

const bar = "block h-3 shrink-0 rounded-full bg-gray-100";
// Bar heights (% of the chart) — a quiet, uneven skyline, not real data.
const SKYLINE = [39, 52, 33, 59, 46, 72, 78, 39, 46, 59, 52, 65, 85, 59, 46, 52, 39, 59, 72, 65, 78, 91, 59, 95, 46, 65, 72, 59, 78, 52];

function CardHead({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className={`${bar} ${title}`} />
      {note && <span className={`${bar} ${note}`} />}
    </div>
  );
}

function TableSkeleton({ rows, cols }: { rows: number; cols: string[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: rows + 1 }, (_, r) => (
        <div key={r} className={`flex items-center gap-3 ${r ? "border-t border-gray-100 pt-[18px] pb-1.5" : "pb-1"}`}>
          <span className={`${bar} w-[min(156px,40%)]`} />
          <span className="flex-1" />
          {cols.map((w, i) => (
            <span key={i} className={`${bar} ${w}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

const card = `flex min-w-0 flex-col gap-4 p-5 md:p-6 ${cardCls}`;

export default function AnalyticsSkeleton() {
  return (
    <div role="status" aria-label="Loading the numbers" className="flex flex-col gap-6">
      {/* KPI strip */}
      <div className={`grid grid-cols-2 overflow-hidden lg:grid-cols-4 ${cardCls}`}>
        {[
          ["w-[58px]", "w-[140px]", "w-[33px]", "w-[125px]"],
          ["w-8", "w-12", "w-[29px]", "w-16"],
          ["w-[85px]", "w-[136px]", "w-7", "w-[191px] max-w-full"],
          ["w-[85px]", "w-[86px]", "w-7", "w-[50px]"],
        ].map(([label, value, delta, sub], i) => (
          <div
            key={i}
            className={`flex min-w-0 flex-col gap-1.5 border-gray-100 px-5 py-4 md:px-6 md:py-5 ${i % 2 === 1 ? "border-l" : ""} ${i > 1 ? "border-t lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
          >
            <span className="flex h-5 items-center">
              <span className={`${bar} ${label}`} />
            </span>
            <span className="flex h-9 items-center gap-2.5">
              <span className={`${bar} ${value} max-w-[60%]`} />
              <span className="flex h-6 items-center rounded-full bg-gray-100 px-2 opacity-60">
                <span className={`${bar} ${delta}`} />
              </span>
            </span>
            <span className="flex h-5 items-center">
              <span className={`${bar} ${sub}`} />
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Revenue by day */}
        <section className={card}>
          <CardHead title="w-[114px]" note="w-[196px] max-w-[45%]" />
          <div className="flex flex-col gap-4">
            <div className="relative h-[200px]">
              {[0, 25, 50, 75].map((top) => (
                <span key={top} className="absolute inset-x-0 h-px bg-gray-100" style={{ top: `${top}%` }} aria-hidden="true" />
              ))}
              <div className="relative flex h-full items-end gap-1.5">
                {SKYLINE.map((h, i) => (
                  <span key={i} className="block min-w-0 flex-1 rounded-full bg-gray-100" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="flex justify-between gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className={`${bar} w-[34px]`} />
              ))}
            </div>
          </div>
        </section>

        {/* Where bookings come from */}
        <section className={card}>
          <CardHead title="w-[220px] max-w-[70%]" />
          {["w-[77px]", "w-[93px]", "w-[130px]"].map((w, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className={`${bar} ${w}`} />
                <span className={`${bar} w-[85px]`} />
              </div>
              <span className="block h-1.5 rounded-full bg-gray-100" />
            </div>
          ))}
          <span className="h-px w-2.5 bg-gray-100" aria-hidden="true" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-4">
              <span className={`${bar} w-[183px] max-w-full`} />
              <span className={`${bar} w-[59px]`} />
            </div>
            <span className={`${bar} w-[86px]`} />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <section className={card}>
          <CardHead title="w-[109px]" note="w-[74px]" />
          <TableSkeleton rows={5} cols={["w-14", "w-[90px] max-sm:hidden", "w-[70px]"]} />
        </section>
        <section className={card}>
          <CardHead title="w-[157px]" note="w-[184px] max-w-[45%]" />
          <TableSkeleton rows={5} cols={["w-14", "w-[70px] max-sm:hidden", "w-[90px]"]} />
        </section>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <section className={card}>
          <CardHead title="w-[86px]" note="w-[132px]" />
          <TableSkeleton rows={3} cols={["w-14", "w-[60px] max-sm:hidden", "w-[90px]"]} />
        </section>
        <section className={card}>
          <CardHead title="w-[139px]" note="w-[86px]" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 border-t border-gray-100 pb-1.5 pt-[18px]">
              <span className={`${bar} w-[min(156px,40%)]`} />
              <span className="flex-1" />
              <span className="block h-1.5 w-[120px] shrink-0 rounded-full bg-gray-100" />
              <span className={`${bar} w-1.5`} />
            </div>
          ))}
          <span className="block h-11 rounded-sm bg-gray-50 p-3">
            <span className={`${bar} w-[156px] max-w-full`} />
          </span>
        </section>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
