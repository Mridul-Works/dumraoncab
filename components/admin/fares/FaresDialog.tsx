"use client";

import Image from "next/image";
import { useEffect, useId, useRef } from "react";

// Centred illustrated alert used across Flow 5 · Fares (5.4 Couldn’t publish,
// 5.5 Leave without publishing, 5.6 Fares published elsewhere, 5.12 Class
// still in use): scrim, 192×128 illustration, title, body and two buttons.
// Escape or a click on the scrim = the safe choice (onCancel). The last
// button gets focus.
export default function FaresDialog({
  art,
  title,
  body,
  children,
  onCancel,
}: {
  art: string; // file in /admin-illustrations
  title: string;
  body: React.ReactNode;
  children: React.ReactNode;
  onCancel: () => void;
}) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    cancelRef.current = onCancel;
  });

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const buttons = box.current?.querySelectorAll<HTMLElement>("[data-actions] button, [data-actions] a");
    buttons?.[buttons.length - 1]?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cancelRef.current();
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
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button type="button" aria-label="Close" onClick={onCancel} className="absolute inset-0 cursor-default bg-scrim [animation:fade_.15s_ease-out]" />
      <div
        ref={box}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
        className="relative flex w-full max-w-[480px] flex-col items-center gap-2 rounded-lg bg-layer px-6 pb-7 pt-6 text-center shadow-[0_16px_48px_0_var(--shadow-md)] [animation:pop_.15s_ease-out] sm:px-8"
      >
        <Image src={`/admin-illustrations/${art}.svg`} alt="" width={192} height={128} unoptimized className="h-32 w-48" />
        <h2 id={`${id}-title`} className="type-h3 text-primary">
          {title}
        </h2>
        <p id={`${id}-desc`} className="type-body-sm text-secondary">
          {body}
        </p>
        <div data-actions className="flex flex-wrap justify-center gap-3 pt-4">
          {children}
        </div>
      </div>
    </div>
  );
}
