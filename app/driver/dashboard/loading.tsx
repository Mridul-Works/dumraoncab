import { CardSkeleton, ScreenSkeleton, StatsSkeleton, SwitchSkeleton } from "@/components/driver/Skeleton";

// Shown instantly while the Dashboard opens (Figma 10.22). Once the page
// answers, the greeting and the Available switch show first and the cards
// fill in under them.
export default function Loading() {
  return (
    <ScreenSkeleton tabs="dashboard" label="Getting your trips…">
      <SwitchSkeleton />
      <StatsSkeleton />
      <CardSkeleton />
    </ScreenSkeleton>
  );
}
