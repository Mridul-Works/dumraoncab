"use client";

import { useEffect, useRef } from "react";
import Icon from "@/components/admin/Icon";

// Right-hand slide-over panel (Figma "Booking drawer": 540px, scrim behind).
// Used by the booking panel and the journal entry panel. Closes on Escape or
// a click on the scrim, and keeps page scroll locked while open.
//
// Layout contract for children: the body scrolls; give its content
// `px-7 py-5.5` padding (28×22 in the design). The footer is padded here.
export default function Drawer({
  title,
  badge,
  subtitle,
  actions,
  onClose,
  children,
  footer,
  width = "max-w-[540px]",
}: {
  title: React.ReactNode;
  badge?: React.ReactNode; // sits right of the title (e.g. a StatusBadge)
  subtitle?: React.ReactNode;
  actions?: React.ReactNode; // button row under the subtitle (Call, WhatsApp…)
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[data-palette-open]")) closeRef.current();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prevFocus?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="Close panel" onClick={onClose} className="absolute inset-0 cursor-default bg-scrim [animation:fade_.15s_ease-out]" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`relative flex h-full w-full ${width} flex-col bg-layer shadow-[0_24px_64px_-8px_var(--shadow-lg),0_8px_16px_-4px_var(--shadow-sm)] outline-none [animation:slide-in_.2s_ease-out]`}
      >
        <header className="flex flex-col gap-2 border-b border-gray-100 px-5 pb-5 pt-6 md:px-7 md:pt-7">
          <div className="flex items-start gap-2.5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
              <h2 className="min-w-0 truncate type-h3 text-primary">{title}</h2>
              {badge}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="-m-1 grid shrink-0 place-items-center rounded-full p-1 text-[var(--icon-primary)] hover:bg-layer-hover">
              <Icon name="x" size={22} />
            </button>
          </div>
          {subtitle && <div className="type-body-sm text-secondary">{subtitle}</div>}
          {actions && <div className="flex flex-wrap gap-2.5 pt-2">{actions}</div>}
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <footer className="flex flex-wrap items-center gap-2.5 border-t border-gray-100 px-5 py-4 md:px-7">{footer}</footer>}
      </div>
    </div>
  );
}
