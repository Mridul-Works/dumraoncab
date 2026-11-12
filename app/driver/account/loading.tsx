import { ListSkeleton, ScreenSkeleton } from "@/components/driver/Skeleton";

// Shown instantly while Account (and its sub-pages) load.
export default function Loading() {
  return (
    <ScreenSkeleton tabs="account" label="Opening your account…">
      <ListSkeleton rows={2} />
      <ListSkeleton rows={4} />
    </ScreenSkeleton>
  );
}
