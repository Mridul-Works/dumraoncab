import { ListSkeleton, ScreenSkeleton } from "@/components/driver/Skeleton";

// Shown instantly while Profile (and its sub-pages) load.
export default function Loading() {
  return (
    <ScreenSkeleton tabs="profile" label="Opening your profile…">
      <ListSkeleton rows={2} />
      <ListSkeleton rows={4} />
    </ScreenSkeleton>
  );
}
