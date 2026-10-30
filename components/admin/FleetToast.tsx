"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@/components/admin/Icon";

// Figma "Toast" (6:275): confirmation after a save. Light surface, elevation/03.
// The page passes the message (from ?saved= / ?deleted=); closing clears the URL.
export default function FleetToast({ message }: { message: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => close(), 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per message
  }, [message]);

  function close() {
    setOpen(false);
    router.replace(pathname, { scroll: false });
  }

  if (!open) return null;
  return (
    <div
      role="status"
      className="fixed bottom-20 left-4 right-4 z-30 flex items-center gap-3 rounded-lg border border-gray-100 bg-layer py-3 pl-3.5 pr-3 shadow-[0_16px_48px_var(--shadow-md)] [animation:pop_.2s_ease-out] sm:bottom-8 sm:left-auto sm:right-10"
    >
      <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-brand text-on-color">
        <Icon name="check-14" size={14} />
      </span>
      <p className="min-w-0 flex-1 type-ui text-primary">{message}</p>
      <span aria-hidden="true" className="h-5 w-px bg-gray-200" />
      <button type="button" onClick={close} aria-label="Dismiss" className="grid shrink-0 place-items-center rounded-full text-[var(--icon-secondary)] hover:text-primary">
        <Icon name="x-16" size={16} />
      </button>
    </div>
  );
}
