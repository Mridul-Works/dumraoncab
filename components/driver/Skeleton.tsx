import { Body, Screen } from "./ui";

// Grey placeholder shapes shown the moment a driver screen is opened, while
// the server builds it (Figma 10.16: cards fill in, no spinner). Used by the
// loading.tsx files in app/driver.

const bar = "rounded-full bg-gray-100";

export function Bar({ className }: { className: string }) {
  return <div className={`${bar} ${className}`} />;
}

// A card of lines with a button at the bottom (next trip, trip step).
export function CardSkeleton({ button = true }: { button?: boolean }) {
  return (
    <div className="flex flex-col gap-[14px] rounded-md border border-gray-200 bg-layer p-[20px]">
      <Bar className="h-[12px] w-[80px]" />
      <Bar className="h-[22px] w-[220px] max-w-full" />
      <Bar className="h-[12px] w-[260px] max-w-full" />
      <Bar className="h-[12px] w-[200px] max-w-full" />
      {button && <Bar className="h-[48px] w-full" />}
    </div>
  );
}

// Row of three small stat boxes (Today, Earnings).
export function StatsSkeleton() {
  return (
    <div className="flex gap-[8px]">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-1 flex-col gap-[8px] rounded-md border border-gray-200 bg-layer px-[12px] py-[14px]">
          <Bar className="h-[16px] w-[48px]" />
          <Bar className="h-[10px] w-[72px] max-w-full" />
        </div>
      ))}
    </div>
  );
}

// A list card of rows (Account, Earnings).
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-[18px] rounded-md border border-gray-200 bg-layer p-[16px]">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-[12px]">
          <div className="size-[40px] shrink-0 rounded-sm bg-gray-100" />
          <div className="flex flex-1 flex-col gap-[8px]">
            <Bar className="h-[12px] w-[140px] max-w-full" />
            <Bar className="h-[10px] w-[200px] max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Whole screen: title, then the given placeholders.
export function ScreenSkeleton({
  tabs,
  label,
  children,
}: {
  tabs?: "today" | "earnings" | "account";
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Screen tabs={tabs}>
      <Body className="gap-[16px] pt-[16px] pb-[20px]">
        <div role="status" aria-label={label} className="flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[8px] pt-[4px]">
            <Bar className="h-[22px] w-[180px]" />
            <Bar className="h-[12px] w-[140px]" />
          </div>
          {children}
          <p className="type-body-sm text-secondary">{label}</p>
        </div>
      </Body>
    </Screen>
  );
}
