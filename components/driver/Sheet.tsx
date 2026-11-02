"use client";

import { useEffect, useRef } from "react";
import Icon from "@/components/admin/Icon";

// Bottom sheet over a dimmed screen (Figma 10.18, 10.19, 10.28, 10.30, 10.31).
export function Sheet({
  open,
  onClose,
  label,
  title,
  handle = false,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  label: string;
  title?: string; // header with a close X (10.28, 10.30)
  handle?: boolean; // drag handle (10.18, 10.19)
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={label}>
      <div className="absolute inset-0 animate-[fade_.2s_ease-out] bg-scrim" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] max-w-[430px] flex-col gap-[16px] overflow-y-auto rounded-t-[24px] bg-layer px-[20px] pb-[max(28px,env(safe-area-inset-bottom))] outline-none ${
          handle ? "pt-[12px]" : "pt-[20px]"
        }`}
      >
        {handle && (
          <div className="flex w-full justify-center">
            <div className="h-[4px] w-[40px] rounded-[2px] bg-gray-200" />
          </div>
        )}
        {title && (
          <div className="flex items-center justify-between gap-[12px]">
            <h2 className="type-h4 text-primary">{title}</h2>
            {onClose && (
              <button type="button" onClick={onClose} aria-label="Close" className="-m-[13px] grid size-[48px] place-items-center text-primary">
                <Icon name="x" size={22} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
