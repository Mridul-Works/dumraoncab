import { CardSkeleton, ScreenSkeleton, StatsSkeleton } from "@/components/driver/Skeleton";
import { PhoneDate } from "@/components/driver/Today";

// Shown instantly while Today loads (Figma 10.23): title and date show at once
// from the phone; trip cards fill in. No spinner.
export default function Loading() {
  return (
    <ScreenSkeleton
      tabs="today"
      label="Getting your trips…"
      header={
        <div className="flex flex-col">
          <h1 className="type-h3 text-primary">Today</h1>
          <p className="type-body-sm text-secondary">
            <PhoneDate />
          </p>
        </div>
      }
    >
      <StatsSkeleton />
      <CardSkeleton />
    </ScreenSkeleton>
  );
}
