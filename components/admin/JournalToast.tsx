"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { undoEntry } from "@/app/admin/journal-actions";
import Icon from "@/components/admin/Icon";

// Figma 4C.7 toast: "Entry saved · Scorpio VLX · net ₹1,099  Undo  ×".
// Undo deletes the new entry and restores the booking it closed.
export default function JournalToast({
  message,
  entryId,
  bookingId,
  was,
  closeHref,
}: {
  message: string;
  entryId?: string; // only for new entries (edits can't be undone)
  bookingId?: string;
  was?: string;
  closeHref: string;
}) {
  const router = useRouter();
  const [undoing, startUndo] = useTransition();
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-30 flex items-center gap-3 rounded-lg border border-gray-100 bg-layer py-3 pl-3.5 pr-3 shadow-[0_16px_48px_var(--shadow-md)] [animation:pop_.2s_ease-out] sm:inset-x-auto sm:bottom-6 sm:right-6 md:bottom-8 md:right-10"
    >
      <span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-brand text-on-color">
        <Icon name="check" size={14} />
      </span>
      <p className="min-w-0 flex-1 type-ui text-primary">{message}</p>
      {entryId && (
        <button
          type="button"
          disabled={undoing}
          onClick={() => startUndo(() => undoEntry(entryId, closeHref, bookingId, was))}
          className="type-ui text-link hover:text-link-hover disabled:opacity-40"
        >
          {undoing ? "Undoing…" : "Undo"}
        </button>
      )}
      <span aria-hidden="true" className="h-5 w-px bg-gray-200" />
      <button type="button" aria-label="Dismiss" onClick={() => router.replace(closeHref, { scroll: false })} className="rounded-full p-0.5 text-[var(--icon-primary)] hover:bg-layer-hover">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
