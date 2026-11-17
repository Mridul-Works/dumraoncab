import Icon from "@/components/admin/Icon";
import { btnPrimary, cardCls } from "@/components/admin/ui";

// Grey bars standing in for text while today loads (Figma 2.5 "Skeleton").
function Bone({ w, h = 11, round = false, className = "" }: { w: number | string; h?: number; round?: boolean; className?: string }) {
  return <span aria-hidden="true" className={`block shrink-0 bg-gray-100 ${round ? "rounded-full" : "rounded-sm"} ${className}`} style={{ width: w, height: h }} />;
}

// A wait chip while loading: solid when the real chip is amber, otherwise a
// light pill holding an icon dot and a text bar (Figma 2.5).
function Chip({ w, text, solid = false }: { w: number; text: number; solid?: boolean }) {
  if (solid) return <Bone w={w} h={20} round />;
  return (
    <span aria-hidden="true" className="flex h-5 shrink-0 items-center gap-1 rounded-full bg-gray-50 pl-2" style={{ width: w }}>
      <Bone w={14} h={14} round />
      <Bone w={text} />
    </span>
  );
}

// Sizes measured from the Figma frame, so the page doesn't jump when it loads.
const kpis = [
  [92, 19, 138],
  [93, 18, 107],
  [138, 31, 164],
  [62, 76, 62],
];
const requests = [
  { name: 74, chip: 108, text: 72, route: 183, solid: true },
  { name: 76, chip: 154, text: 118, route: 215, solid: true },
  { name: 92, chip: 132, text: 96, route: 198, solid: true },
  { name: 97, chip: 129, text: 93, route: 240, solid: false },
];
const pickups = [
  { name: 88, route: 225, right: 76 },
  { name: 77, route: 240, right: 149 },
  { name: 77, route: 195, right: 51 },
];
const fleet = [
  { name: 41, sub: 117, right: 91 },
  { name: 83, sub: 104, right: 102 },
  { name: 44, sub: 124, right: 87 },
];
const stats = [
  [58, 116, 29],
  [85, 106, 157],
  [32, 34, 113],
];
const bars = [
  { count: 8, h: 36, day: 30 },
  { count: 16, h: 50, day: 24 },
  { count: 8, h: 27, day: 31 },
  { count: 8, h: 41, day: 25 },
  { count: 16, h: 54, day: 40 },
  { count: 16, h: 63, day: 22 },
  { count: 8, h: 32, day: 25 },
];

// Figma 2.5 Dashboard · loading: the page's real header (search works) with a
// skeleton of every card; Add phone booking waits until today has loaded.
export default function DashboardSkeleton({ greeting, dateLine, search }: { greeting: string; dateLine: string; search: React.ReactNode }) {
  return (
    <div role="status" aria-label="Loading today" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="type-h2 text-primary">{greeting}</h1>
          <p className="mt-1 flex items-center gap-2 type-body-sm text-secondary">
            <Icon name="dot" size={8} className="text-brand" />
            {dateLine} · loading today…
          </p>
        </div>
        <div className="w-full md:w-auto">{search}</div>
        <span aria-disabled="true" className={`${btnPrimary} pointer-events-none opacity-40`}>
          <Icon name="plus" />
          Add phone booking
        </span>
      </div>

      <div className="animate-pulse flex flex-col gap-5">
        {/* KPI strip */}
        <div className={`grid grid-cols-2 overflow-hidden md:grid-cols-4 ${cardCls}`}>
          {kpis.map(([a, b, c], i) => (
            <div key={i} className={`flex flex-col gap-1 px-5 py-4 ${i < 3 ? "md:border-r" : ""} ${i % 2 === 0 ? "border-r" : ""} border-gray-100`}>
              <Bone w={a} />
              <div className="flex items-end gap-2.5">
                <Bone w={b} h={14} />
                <Bone w={c} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Needs a call back */}
          <div className={cardCls}>
            <div className="flex flex-col gap-3 border-b border-gray-100 px-5 pb-4 pt-4.5">
              <div className="flex items-center gap-2.5">
                <Bone w={153} h={13} />
                <Bone w={9} />
                <span className="flex-1" />
                <Bone w={130} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <Bone w={98} />
                  <Bone w={45} />
                </div>
                <Bone w="100%" h={6} round />
              </div>
            </div>
            {requests.map((r, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-gray-100 py-3 pl-5 pr-4">
                <Bone w={36} h={36} round />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex h-5 items-center gap-2">
                    <Bone w={r.name} />
                    <Chip w={r.chip} text={r.text} solid={r.solid} />
                  </div>
                  <Bone w={r.route} className="max-w-full" />
                </div>
                <div className="hidden items-start gap-2 sm:flex">
                  <Bone w={92} h={42} round />
                  <Bone w={136} h={40} round />
                </div>
              </div>
            ))}
            <div className="px-5 pb-2.5 pt-2">
              <Bone w={191} h={40} round />
            </div>
          </div>

          {/* Up next */}
          <div className="flex flex-col gap-3.5 rounded-lg border-[1.5px] border-gray-100 bg-layer p-5">
            <div className="flex items-center justify-between">
              <Bone w={68} h={13} />
              <Chip w={118} text={82} />
            </div>
            <div className="flex items-end gap-2.5">
              <Bone w={125} h={14} />
              <Bone w={39} />
            </div>
            <div className="flex flex-col gap-0.5">
              <Bone w={77} />
              <Bone w={106} />
            </div>
            <div className="flex flex-col gap-2 rounded-md bg-gray-50 p-3">
              {[206, 156].map((w) => (
                <div key={w} className="flex items-center gap-2">
                  <Bone w={16} h={16} round />
                  <Bone w={w} className="max-w-full" />
                </div>
              ))}
            </div>
            <div className="flex h-7 items-center gap-2">
              <Bone w={16} h={16} round />
              <Bone w={137} />
              <span className="flex-1" />
              <Bone w={104} h={28} round />
            </div>
            <div className="flex items-start gap-2">
              <Bone w="50%" h={42} round className="flex-1" />
              <Bone w="50%" h={40} round className="flex-1" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Today's pickups */}
          <div className={cardCls}>
            <div className="flex items-center gap-2 pb-2.5 pl-5 pr-3 pt-3.5">
              <Bone w={139} h={13} />
              <Bone w={8} />
              <span className="flex-1" />
              <Bone w={158} h={40} round />
            </div>
            <div className="flex flex-col pb-3 pl-5 pr-4">
              {pickups.map((p, i) => (
                <div key={i} className="flex items-start gap-3.5">
                  <Bone w={84} />
                  <span className="flex w-3.5 flex-col items-center self-stretch pt-[3px]">
                    <Bone w={14} h={14} round />
                    {i < pickups.length - 1 && <span className="w-0.5 flex-1 bg-gray-100" />}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-4.5">
                    <Bone w={p.name} />
                    <Bone w={p.route} className="max-w-full" />
                  </div>
                  <Bone w={p.right} />
                </div>
              ))}
            </div>
          </div>

          {/* Fleet right now */}
          <div className={`flex flex-col gap-3 p-5 ${cardCls}`}>
            <div className="flex items-center justify-between">
              <Bone w={132} h={13} />
              <Bone w={113} h={40} round />
            </div>
            <div className="flex items-end gap-2.5">
              <Bone w={60} h={14} />
              <Bone w={62} />
            </div>
            {fleet.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 border-t border-gray-100 pt-2">
                <Bone w={18} h={18} round />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Bone w={f.name} />
                  <Bone w={f.sub} />
                </div>
                <Bone w={f.right} />
              </div>
            ))}
          </div>
        </div>

        {/* This week */}
        <div className={`flex flex-col gap-3 p-5 ${cardCls}`}>
          <div className="flex h-4 items-center gap-2">
            <Bone w={87} h={13} />
            <span className="flex-1" />
            <Bone w={199} className="hidden sm:block" />
            <span className="flex items-center gap-1.5 pl-4">
              <Bone w={102} />
              <Bone w={16} h={16} round />
            </span>
          </div>
          <div className="flex flex-wrap gap-x-12 gap-y-3">
            {stats.map(([a, b, c], i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <Bone w={a} />
                <div className="flex items-end gap-2">
                  <Bone w={b} h={14} />
                  <Bone w={c} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-2 sm:gap-6">
            {bars.map((b, i) => (
              <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <Bone w={b.count} h={9} />
                <Bone w="100%" h={b.h} />
                <Bone w={b.day} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
