"use client";

import { useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { btnPrimary, cardCls } from "@/components/admin/ui";

// Figma 4.7 "Fleet · couldn't load": Empty state card with the error
// illustration and a Try again button that re-reads the fleet.
export default function FleetLoadError() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div role="alert" className={`${cardCls} flex flex-col items-center py-12 sm:py-[72px]`}>
      <div className="flex w-full max-w-[520px] flex-col items-center gap-2 px-6 py-10 text-center">
        <Image src="/admin-illustrations/fleet-load-failed.svg" alt="" width={240} height={160} unoptimized className="h-40 w-60" />
        <span aria-hidden="true" className="h-3" />
        <h2 className="type-h3 text-primary">Couldn’t load your cars</h2>
        <p className="type-body-md text-secondary">Check the internet connection and try again. The website still shows your cars as they were.</p>
        <div className="flex gap-3 pt-4">
          <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className={btnPrimary}>
            {pending ? "Trying…" : "Try again"}
          </button>
        </div>
      </div>
    </div>
  );
}
