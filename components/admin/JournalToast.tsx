"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { undoApprove, undoDelete, undoEntry, undoFix } from "@/app/admin/journal-actions";
import Icon from "@/components/admin/Icon";

// Daily Diary toasts, bottom of the page:
// 4C.7  "Entry saved · Scorpio VLX · net ₹1,099  Undo  ×" — Undo deletes the
//       new entry and restores the booking it closed.
// 4C.10 "Entry deleted · …  Undo" — for 10 seconds, then it goes away.
// 4B.7  "DC-1083 approved. ₹640 added to Rakesh's Monday payout.  Undo" (centred)
//       — Undo puts the driver entry back to waiting.
// 4B.12 "Asked Rakesh to fix the toll receipt. DC-1083 waits for his reply.  Undo"
// 4B.13 "Couldn't make the CSV. Your filters are kept.  Try again" — client
//       side, with `action` and `onClose` instead of a server undo.
export default function JournalToast({
  message,
  entryId,
  bookingId,
  was,
  approvedId,
  fixedId,
  deletedId,
  action,
  tone = "good",
  center,
  closeHref,
  onClose,
  autoCloseMs,
}: {
  message: string;
  entryId?: string; // only for new entries (edits can't be undone)
  bookingId?: string;
  was?: string;
  approvedId?: string; // a just-approved driver entry
  fixedId?: string; // a driver entry just sent back with "Ask to fix"
  deletedId?: string; // a just-deleted entry
  action?: { label: string; onClick: () => void };
  tone?: "good" | "bad";
  center?: boolean;
  closeHref?: string;
  onClose?: () => void;
  autoCloseMs?: number;
}) {
  const router = useRouter();
  const [undoing, startUndo] = useTransition();
  const close = () => (onClose ? onClose() : closeHref && router.replace(closeHref, { scroll: false }));

  useEffect(() => {
    if (!autoCloseMs || undoing) return;
    const t = setTimeout(() => (onClose ? onClose() : closeHref && router.replace(closeHref, { scroll: false })), autoCloseMs);
    return () => clearTimeout(t);
  }, [autoCloseMs, undoing, onClose, closeHref, router]);

  const back = closeHref ?? "/admin/journal";
  const undo = approvedId
    ? () => undoApprove(approvedId, back, was)
    : fixedId
      ? () => undoFix(fixedId, back)
      : deletedId
        ? () => undoDelete(deletedId, back)
        : entryId
          ? () => undoEntry(entryId, back, bookingId, was)
          : null;

  return (
    <div
      role={tone === "bad" ? "alert" : "status"}
      className={`fixed inset-x-4 bottom-20 z-30 flex items-center gap-3 rounded-lg border border-gray-100 bg-layer py-3 pl-3.5 pr-3 shadow-[0_16px_48px_var(--shadow-md)] [animation:pop_.2s_ease-out] sm:inset-x-auto sm:bottom-6 md:bottom-8 ${
        center ? "sm:left-1/2 sm:-translate-x-1/2 md:left-[calc(50%+124px)]" : "sm:right-6 md:right-10"
      }`}
    >
      <span className={`grid size-6.5 shrink-0 place-items-center rounded-full text-on-color ${tone === "bad" ? "bg-error-500" : "bg-brand"}`}>
        <Icon name={tone === "bad" ? "warning-circle-14" : "check"} size={14} />
      </span>
      <p className="min-w-0 flex-1 type-ui text-primary">{message}</p>
      {undo && (
        <button type="button" disabled={undoing} onClick={() => startUndo(undo)} className="type-ui text-link hover:text-link-hover disabled:opacity-40">
          {undoing ? "Undoing…" : "Undo"}
        </button>
      )}
      {action && (
        <button type="button" onClick={action.onClick} className="type-ui text-link hover:text-link-hover">
          {action.label}
        </button>
      )}
      <span aria-hidden="true" className="h-5 w-px bg-gray-200" />
      <button type="button" aria-label="Dismiss" onClick={close} className="rounded-full p-0.5 text-[var(--icon-primary)] hover:bg-layer-hover">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
