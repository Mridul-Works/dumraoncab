import { CardSkeleton, ScreenSkeleton } from "@/components/driver/Skeleton";

// Shown instantly while a trip step loads.
export default function Loading() {
  return (
    <ScreenSkeleton label="Opening the trip…">
      <CardSkeleton button={false} />
      <CardSkeleton />
    </ScreenSkeleton>
  );
}
