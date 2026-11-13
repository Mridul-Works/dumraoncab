"use client";

import { useEffect } from "react";
import Icon from "@/components/admin/Icon";

export type DashToastMsg = { id: number; text: string; tone?: "done" | "error"; action?: { label: string; run: () => void } };

// Figma "Toast" (2.8): light surface, elevation/03, optional Undo. Closes itself after `ms`.
export default function DashToast({ toast, onClose, ms = 10_000 }: { toast: DashToastMsg; onClose: () => void; ms?: number }) {
  useEffect(() => {
    const t = setTimeout(onClose, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one timer per toast
  }, [toast.id, ms]);

  const error = toast.tone === "error";
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-30 flex items-center gap-3 rounded-lg border border-gray-100 bg-layer py-3 pl-3.5 pr-3 shadow-[0_16px_48px_var(--shadow-md)] [animation:pop_.15s_ease-out] sm:inset-x-auto sm:bottom-8 sm:right-10"
    >
      <span className={`grid size-6.5 shrink-0 place-items-center rounded-full text-on-color ${error ? "bg-error-500" : "bg-brand"}`}>
        <Icon name={error ? "warning-circle-14" : "check-14"} size={14} />
      </span>
      <p className="min-w-0 flex-1 type-ui text-primary">{toast.text}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.run();
            onClose();
          }}
          className="shrink-0 type-ui text-link hover:text-link-hover"
        >
          {toast.action.label}
        </button>
      )}
      <span aria-hidden="true" className="h-5 w-px shrink-0 bg-gray-200" />
      <button type="button" onClick={onClose} aria-label="Dismiss" className="grid shrink-0 place-items-center rounded-full text-[var(--icon-secondary)] hover:text-primary">
        <Icon name="x-16" size={16} />
      </button>
    </div>
  );
}
