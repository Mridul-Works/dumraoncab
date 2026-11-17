import { ExportPlaceholder } from "@/components/admin/analytics/Header";
import AnalyticsSkeleton from "@/components/admin/analytics/Skeleton";

// Analytics while the route itself loads (Figma 7.8). Once the page renders,
// its header takes over and the numbers stream in behind the same skeleton.
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-[min(100%,16rem)] flex-1">
          <h1 className="type-h1 text-primary">Analytics</h1>
          <span className="mt-3 block h-3 w-56 max-w-full rounded-full bg-gray-100" />
        </div>
        {/* The range switch waits too (the URL range isn't known here). */}
        <span className="flex max-w-full gap-0.5 overflow-x-auto rounded-full border border-gray-100 bg-layer p-1" aria-hidden="true">
          {["7 days", "This month", "Last month", "This year", "Custom"].map((label) => (
            <span key={label} className="whitespace-nowrap rounded-full border border-transparent px-3.5 py-[7px] type-ui text-secondary">
              {label}
            </span>
          ))}
        </span>
        <ExportPlaceholder />
      </div>
      <AnalyticsSkeleton />
    </div>
  );
}
