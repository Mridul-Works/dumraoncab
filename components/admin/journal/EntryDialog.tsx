"use client";

import { useEffect, useRef } from "react";

// Centred dialog over the entry panel (Figma 4C.8 "Couldn't save the entry",
// 4C.10 "Delete this entry?", 4C.11 "Discard this entry?"). With `art` the
// content is centred under the illustration; without, it's left-aligned with
// the buttons on the right. Escape or a click on the scrim cancels.
export default function EntryDialog({
  title,
  children,
  art,
  footer,
  onCancel,
}: {
  title: string;
  children: React.ReactNode;
  art?: string; // illustration src
  footer: React.ReactNode;
  onCancel: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    cancelRef.current = onCancel;
  });

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    box.current?.focus();
    // Capture phase, so Escape closes this dialog and not the drawer under it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      cancelRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      prev?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <button type="button" aria-label="Close" onClick={onCancel} className="fixed inset-0 cursor-default bg-scrim [animation:fade_.15s_ease-out]" />
      <div
        ref={box}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative my-auto flex w-full flex-col rounded-lg bg-layer shadow-[0_16px_48px_0_var(--shadow-md)] outline-none [animation:pop_.15s_ease-out] ${
          art ? "max-w-[420px] items-center gap-2 px-6 pb-7 pt-6 text-center" : "max-w-[400px] gap-2 px-6 pb-5 pt-5"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static line-art SVG from the design */}
        {art && <img src={art} alt="" width={144} height={96} className="h-24 w-36" />}
        <h2 className="type-h3 text-primary">{title}</h2>
        <p className="type-body-sm text-secondary">{children}</p>
        <div className={`flex flex-wrap gap-3 pt-3 ${art ? "justify-center" : "justify-end"}`}>{footer}</div>
      </div>
    </div>
  );
}
