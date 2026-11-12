import { ListSkeleton, ScreenSkeleton, StatsSkeleton } from "@/components/driver/Skeleton";

// Shown instantly while Earnings loads.
export default function Loading() {
  return (
    <ScreenSkeleton tabs="earnings" label="Getting your earnings…">
      <StatsSkeleton />
      <ListSkeleton rows={5} />
    </ScreenSkeleton>
  );
}
