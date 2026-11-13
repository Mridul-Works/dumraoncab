"use client";

import { useRouter } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { useOnline } from "@/components/admin/dashboard/connection";

// Dashboard header line: "Fri, 30 Oct · updated just now, 9:40 AM"
// (Figma 2.1) — "last updated" while offline (2.10).
export function LiveStatus({ dateLine, time }: { dateLine: string; time: string }) {
  const online = useOnline();
  return (
    <p className="mt-1 flex items-center gap-2 type-body-sm text-secondary">
      <Icon name="dot" size={8} className="text-brand" />
      {dateLine} · {online ? "updated just now" : "last updated"}, {time}
    </p>
  );
}

// "Try again" on a card that couldn't load (Figma 2.6): reloads the page data,
// the rest of the dashboard stays as it is.
export function RetryButton({ className }: { className: string }) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.refresh()} className={className}>
      Try again
    </button>
  );
}
