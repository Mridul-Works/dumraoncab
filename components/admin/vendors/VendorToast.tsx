"use client";

import { useEffect, useRef } from "react";
import Icon from "@/components/admin/Icon";

// Figma "Toast" with an optional Undo link (6.8, 6.11, 6.16, 6.17). Bottom
// centre of the content area; closes itself after 8 seconds.
export type ToastMsg = { text: string; undo?: () => void; key: number };

export default function VendorToast({ toast, onClose }: { toast: ToastMsg | null; onClose: () => void }) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => closeRef.current(), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;
  return (
    <div
      key={toast.key}
      role="status"
      className="fixed inset-x-4 bottom-20 z-30 flex items-center gap-3 rounded-lg border border-gray-100 bg-layer py-3 pl-3.5 pr-3 shadow-[0_16px_48px_var(--shadow-md)] [animation:pop_.2s_ease-out] md:inset-x-auto md:bottom-8 md:left-[calc(50%+124px)] md:-translate-x-1/2"
    >
      <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-brand text-on-color">
        <Icon name="check-14" size={14} />
      </span>
      <p className="min-w-0 flex-1 type-ui text-primary md:whitespace-nowrap">{toast.text}</p>
      {toast.undo && (
        <button
          type="button"
          onClick={() => {
            toast.undo?.();
            onClose();
          }}
          className="type-ui text-link hover:text-link-hover"
        >
          Undo
        </button>
      )}
      <span aria-hidden="true" className="h-5 w-px bg-gray-200" />
      <button type="button" onClick={onClose} aria-label="Dismiss" className="grid shrink-0 place-items-center rounded-full text-[var(--icon-secondary)] hover:text-primary">
        <Icon name="x-16" size={16} />
      </button>
    </div>
  );
}
