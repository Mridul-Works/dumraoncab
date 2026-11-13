"use client";

import { useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { btnPrimary, cardCls } from "@/components/admin/ui";

// Analytics "couldn't load" state (Figma 7.6). Try again re-runs the page on
// the server; the rest of the admin is unaffected.
export default function LoadFailed() {
  const router = useRouter();
  const [busy, start] = useTransition();
  return (
    <section role="alert" className={`flex flex-col items-center px-6 py-20 text-center ${cardCls}`}>
      <div className="flex w-full max-w-[520px] flex-col items-center gap-2 py-10">
        <Image src="/admin-illustrations/analytics-couldnt-load.svg" alt="" width={240} height={160} unoptimized className="h-40 w-60" />
        <h2 className="mt-3 type-h3 text-primary">Couldn’t load the numbers</h2>
        <p className="type-body-md text-secondary">Check the internet connection and try again. Bookings and the Daily Diary are not affected.</p>
        <div className="pt-4">
          <button type="button" disabled={busy} aria-busy={busy} onClick={() => start(() => router.refresh())} className={btnPrimary}>
            {busy ? "Trying again…" : "Try again"}
          </button>
        </div>
      </div>
    </section>
  );
}
