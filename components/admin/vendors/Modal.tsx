"use client";

import { useEffect, useRef } from "react";
import Icon from "@/components/admin/Icon";

// Centred confirm dialog (Figma 6.7 / 6.9 / 6.10): scrim, a round tone icon,
// title + subtitle, body and a right-aligned button row. Escape or a click on
// the scrim closes it.
const toneCls = {
  good: "bg-tag-green text-brand",
  bad: "bg-tag-red text-error",
  warn: "bg-tag-amber text-tag-amber",
} as const;

export default function Modal({
  icon,
  tone,
  title,
  subtitle,
  children,
  footer,
  onClose,
  width = "max-w-[384px]",
}: {
  icon: string;
  tone: keyof typeof toneCls;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  footer: React.ReactNode;
  onClose: () => void;
  width?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 cursor-default bg-scrim [animation:fade_.15s_ease-out]" />
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`relative my-auto flex w-full ${width} flex-col gap-4 rounded-xl bg-layer p-5 shadow-[0_24px_64px_-8px_var(--shadow-lg),0_8px_16px_-4px_var(--shadow-sm)] outline-none [animation:pop_.15s_ease-out]`}
      >
        <div className="flex items-start gap-3">
          <span className={`grid size-8 shrink-0 place-items-center rounded-full ${toneCls[tone]}`}>
            <Icon name={icon} size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="type-h4 text-primary">{title}</h2>
            {subtitle && <p className="mt-1 type-body-sm text-secondary">{subtitle}</p>}
          </div>
        </div>
        {children}
        <div className="flex flex-wrap justify-end gap-2.5">{footer}</div>
      </div>
    </div>
  );
}
