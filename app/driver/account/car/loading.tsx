import { ListSkeleton, ScreenSkeleton } from "@/components/driver/Skeleton";

// Shown instantly while this Profile page loads (no tab bar here).
export default function Loading() {
  return (
    <ScreenSkeleton label="Loading…">
      <ListSkeleton rows={3} />
    </ScreenSkeleton>
  );
}
