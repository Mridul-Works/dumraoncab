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
        <span className="block h-[46px] w-[471px] max-w-full rounded-full border border-gray-100 bg-layer" aria-hidden="true" />
        <ExportPlaceholder />
      </div>
      <AnalyticsSkeleton />
    </div>
  );
}
