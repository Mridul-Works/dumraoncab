"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Icon from "@/components/admin/Icon";
import { btnPrimary } from "@/components/admin/ui";

// Figma 5.11 "Fares didn't load": the store couldn't be read. Nothing to edit,
// the public site keeps the last published fares; Try again re-runs the page.
export default function FaresLoadFailed() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <h1 className="type-h2 text-primary">Fares</h1>
          <p className="mt-1 flex items-start gap-1.5 type-body-sm text-secondary">
            <Icon name="clock" size={14} className="mt-0.75 shrink-0" />
            The website keeps showing the last published fares
          </p>
        </div>
        <button type="button" disabled className={btnPrimary}>
          <Icon name="pencil-simple" size={16} />
          Edit fares
        </button>
      </div>

      <div role="alert" className="mx-auto flex max-w-[520px] flex-col items-center gap-2 px-6 pb-10 pt-16 text-center sm:pt-[120px]">
        <Image src="/admin-illustrations/fleet-load-failed.svg" alt="" width={240} height={160} unoptimized className="h-40 w-60" />
        <span className="h-3" aria-hidden="true" />
        <h2 className="type-h3 text-primary">Couldn’t load fares</h2>
        <p className="type-body-md text-secondary">The website still shows the last published fares. Check the internet and try again.</p>
        <div className="pt-4">
          <button type="button" onClick={() => start(() => router.refresh())} disabled={pending} className={btnPrimary}>
            {pending ? "Trying again…" : "Try again"}
          </button>
        </div>
      </div>
    </div>
  );
}
