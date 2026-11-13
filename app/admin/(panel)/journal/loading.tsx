import { PageHeader, cardCls } from "@/components/admin/ui";

// Figma 4B.11 "Daily Diary · loading": the real header, then grey bars in the
// shape of the filters, totals, fare split, the three side panels and the
// trips table.
const bar = "rounded-full bg-gray-100";
const dot = "size-[18px] shrink-0 rounded-full bg-gray-100";

export default function JournalLoading() {
  return (
    <div role="status" aria-label="Loading the Daily Diary">
      <PageHeader title="Daily Diary" intro="Kilometres, fuel and driver cut for every trip, so you know what each car really earns." />

      {/* Filters */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex h-[46px] items-center gap-6 rounded-md border border-gray-200 bg-layer px-4">
          <span className={`h-3 w-10 ${bar}`} />
          <span className={`h-3 w-16 ${bar}`} />
          <span className="h-9 w-[106px] rounded-sm border border-gray-200 bg-gray-50" />
          <span className={`h-3 w-14 ${bar}`} />
        </div>
        <div className="flex h-[42px] items-center gap-2 rounded-md border border-gray-200 bg-layer px-3">
          <span className={dot} />
          <span className={`h-3 w-26 ${bar}`} />
        </div>
        <div className="flex h-[42px] items-center gap-2 rounded-md border border-gray-200 bg-layer px-3">
          <span className={dot} />
          <span className={`h-3 w-12 ${bar}`} />
          <span className={dot} />
        </div>
        <span className="ml-auto hidden h-[38px] w-40 rounded-md bg-gray-50 sm:block" />
      </div>

      {/* Totals */}
      <div className={`mt-5 grid grid-cols-2 overflow-hidden md:grid-cols-5 ${cardCls}`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`flex flex-col gap-4 border-gray-100 px-5 py-4 ${i < 4 ? "md:border-r" : "bg-gray-50"}`}>
            <span className="flex items-center gap-2">
              <span className={dot} />
              <span className={`h-3 w-18 ${bar}`} />
            </span>
            <span className={`h-3 w-28 ${bar}`} />
            <span className={`h-3 w-24 ${bar}`} />
          </div>
        ))}
      </div>

      {/* Where the fare went */}
      <div className="mt-5 flex flex-col gap-3">
        <span className={`h-2 w-full ${bar}`} />
        <span className="flex gap-4">
          <span className={`h-3 w-34 ${bar}`} />
          <span className={`h-3 w-18 ${bar}`} />
          <span className={`h-3 w-18 ${bar}`} />
          <span className={`h-3 w-16 ${bar}`} />
        </span>
      </div>

      {/* Needs attention · By car · Service due */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((p) => (
          <div key={p} className={`overflow-hidden ${cardCls}`}>
            <div className="border-b border-gray-100 px-5 py-4">
              <span className={`block h-3.5 w-36 ${bar}`} />
            </div>
            <div className="flex flex-col">
              {[0, 1, 2, 3].map((r) => (
                <div key={r} className={`flex items-center gap-3 px-5 py-4 ${p === 0 ? "border-b border-gray-100" : ""}`}>
                  {p !== 1 && <span className={dot} />}
                  <span className="flex flex-1 flex-col gap-2">
                    <span className={`h-3 w-2/3 ${bar}`} />
                    <span className={`h-3 ${p === 0 ? "w-4/5" : "w-full"} ${bar}`} />
                  </span>
                  {p === 0 && <span className={dot} />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Trips table */}
      <div className={`mt-5 overflow-hidden ${cardCls}`}>
        <div className="flex items-center gap-4 border-b border-gray-100 px-5 py-4">
          <span className={`h-3 w-36 ${bar}`} />
          <span className={`h-3 w-52 ${bar}`} />
          <span className="flex-1" />
          <span className={`hidden h-3 w-80 md:block ${bar}`} />
        </div>
        {[0, 1, 2].map((d) => (
          <div key={d}>
            <div className="flex items-center gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3.5">
              <span className={`h-3 w-10 ${bar}`} />
              <span className={`h-3 w-18 ${bar}`} />
              <span className="flex-1" />
              <span className={`hidden h-3 w-96 md:block ${bar}`} />
            </div>
            {[0, 1].map((r) => (
              <div key={r} className="flex items-center gap-4 border-b border-gray-100 px-5 py-4">
                <span className="size-8 shrink-0 rounded-full bg-gray-100" />
                <span className="flex w-24 flex-col gap-2">
                  <span className={`h-3 w-full ${bar}`} />
                  <span className={`h-3 w-3/4 ${bar}`} />
                </span>
                <span className="flex flex-1 flex-col gap-2">
                  <span className={`h-3 w-3/5 max-w-[220px] ${bar}`} />
                  <span className={`h-3 w-2/5 max-w-[140px] ${bar}`} />
                </span>
                <span className={`hidden h-3 w-96 md:block ${bar}`} />
                <span className={dot} />
              </div>
            ))}
          </div>
        ))}
        <div className="p-3">
          <span className="block h-10 w-40 rounded-md bg-gray-100" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
