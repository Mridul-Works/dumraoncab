import Icon from "@/components/admin/Icon";
import { btnPrimary, cardCls } from "@/components/admin/ui";

// Grey bars standing in for text while today loads (Figma 2.5 "Skeleton").
function Bone({ w, h = 11, round = false, className = "" }: { w: number | string; h?: number; round?: boolean; className?: string }) {
  return <span aria-hidden="true" className={`block shrink-0 bg-gray-100 ${round ? "rounded-full" : "rounded-sm"} ${className}`} style={{ width: w, height: h }} />;
}

const kpis = [
  [92, 19, 138],
  [93, 18, 107],
  [138, 31, 164],
  [62, 76, 62],
];
const requests = [74, 76, 92, 97];
const bars = [36, 50, 27, 41, 54, 63, 32];

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
            <div key={i} className={`flex flex-col gap-2 px-5 py-4 ${i < 3 ? "md:border-r" : ""} ${i % 2 === 0 ? "border-r" : ""} border-gray-100`}>
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
              <div className="flex justify-between">
                <Bone w={98} />
                <Bone w={45} />
              </div>
              <Bone w="100%" h={6} round />
            </div>
            {requests.map((w, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-gray-100 py-3 pl-5 pr-4">
                <Bone w={36} h={36} round />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Bone w={w} />
                    <Bone w={96} h={20} round />
                  </div>
                  <Bone w={200} className="max-w-full" />
                </div>
                <div className="hidden gap-2 sm:flex">
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
          <div className={`flex flex-col gap-3.5 p-5 ${cardCls}`}>
            <div className="flex items-center justify-between">
              <Bone w={68} h={13} />
              <Bone w={100} h={20} round />
            </div>
            <div className="flex items-end gap-2.5">
              <Bone w={125} h={14} />
              <Bone w={39} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Bone w={77} />
              <Bone w={106} />
            </div>
            <div className="flex flex-col gap-2 rounded-md bg-gray-50 p-3">
              <Bone w={206} className="max-w-full" />
              <Bone w={156} />
            </div>
            <div className="flex items-center justify-between">
              <Bone w={137} />
              <Bone w={104} h={28} round />
            </div>
            <div className="flex gap-2">
              <Bone w="50%" h={42} round />
              <Bone w="50%" h={40} round />
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
              {[225, 240, 195].map((w, i) => (
                <div key={i} className="flex items-start gap-3.5">
                  <Bone w={84} />
                  <span className="flex w-4 flex-col items-center self-stretch pt-[3px]">
                    <Bone w={14} h={14} round />
                    {i < 2 && <span className="w-0.5 flex-1 bg-gray-100" />}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 pb-4.5">
                    <Bone w={88} />
                    <Bone w={w} className="max-w-full" />
                  </div>
                  <Bone w={76} />
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
            {[117, 104, 124].map((w, i) => (
              <div key={i} className="flex items-center gap-2.5 border-t border-gray-100 pt-2">
                <Bone w={18} h={18} round />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Bone w={44} />
                  <Bone w={w} />
                </div>
                <Bone w={90} />
              </div>
            ))}
          </div>
        </div>

        {/* This week */}
        <div className={`flex flex-col gap-3 p-5 ${cardCls}`}>
          <div className="flex items-center gap-2">
            <Bone w={87} h={13} />
            <span className="flex-1" />
            <Bone w={199} className="hidden sm:block" />
            <Bone w={120} />
          </div>
          <div className="flex flex-wrap gap-x-12 gap-y-3">
            {[
              [58, 116, 29],
              [85, 106, 157],
              [32, 34, 113],
            ].map(([a, b, c], i) => (
              <div key={i} className="flex flex-col gap-2">
                <Bone w={a} />
                <div className="flex items-end gap-2">
                  <Bone w={b} h={14} />
                  <Bone w={c} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-2 sm:gap-6">
            {bars.map((h, i) => (
              <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <Bone w={12} h={9} />
                <Bone w="100%" h={h} />
                <Bone w={28} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
