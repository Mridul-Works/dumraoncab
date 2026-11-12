import { CardSkeleton, ScreenSkeleton, StatsSkeleton } from "@/components/driver/Skeleton";

// Shown instantly while Today loads (Figma 10.16).
export default function Loading() {
  return (
    <ScreenSkeleton tabs="today" label="Getting your trips…">
      <div className="h-[76px] rounded-lg border border-gray-100 bg-layer" />
      <StatsSkeleton />
      <CardSkeleton />
    </ScreenSkeleton>
  );
}
