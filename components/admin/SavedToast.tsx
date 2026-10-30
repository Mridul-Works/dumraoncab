"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/admin/Icon";

// "Booking saved" toast (Figma 44:2100). Shown after the New booking form
// redirects with ?saved=<id>&n=<customer name>&wa=1 (wa = WhatsApp message was
// opened). Closing it — or 8 seconds passing — strips those params.
// Must sit inside a <Suspense> boundary (it reads search params).
export default function SavedToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const saved = params.get("saved");
  const name = params.get("n") ?? "";
  const wa = params.get("wa") === "1";

  const close = () => {
    const next = new URLSearchParams(params.toString());
    for (const k of ["saved", "n", "wa"]) next.delete(k);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const closeLatest = useLatest(close);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => closeLatest.current(), 8000);
    return () => clearTimeout(t);
  }, [saved, closeLatest]);

  if (!saved) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-30 flex items-center gap-3 rounded-lg border border-gray-100 bg-layer py-3 pl-3.5 pr-3 shadow-[0_16px_24px_var(--shadow-md)] [animation:pop_.15s_ease-out] md:inset-x-auto md:bottom-10 md:right-10"
    >
      <span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-brand text-on-color">
        <Icon name="check" size={14} />
      </span>
      <p className="min-w-0 flex-1 type-ui text-primary">
        Booking saved{name ? ` for ${name}` : ""}
        {wa ? " · confirmation opened in WhatsApp" : ""}
      </p>
      <span className="h-5 w-px bg-gray-200" aria-hidden="true" />
      <button type="button" onClick={close} aria-label="Dismiss" className="grid place-items-center rounded-full p-0.5 text-[var(--icon-secondary)] hover:text-primary">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

// Keeps a ref pointed at the latest value (so the timer always calls the current close()).
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
