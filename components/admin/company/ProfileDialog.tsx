"use client";

import Image from "next/image";
import { useEffect, useId, useRef } from "react";

// Centred illustrated alert for the Company profile (Figma 8.5 "Couldn’t save
// the profile" · 8.6 "Leave without saving?"): scrim, 192×128 illustration,
// title, body and two buttons. Escape or a click on the scrim = the safe choice.
export default function ProfileDialog({
  art,
  title,
  body,
  children,
  onCancel,
}: {
  art: string; // file in /admin-illustrations
  title: string;
  body: React.ReactNode;
  children: React.ReactNode; // the buttons; the last one gets focus
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
    const buttons = box.current?.querySelectorAll<HTMLButtonElement>("[data-actions] button");
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
      <button type="button" aria-label="Keep editing" onClick={onCancel} className="absolute inset-0 cursor-default bg-scrim [animation:fade_.15s_ease-out]" />
      <div
        ref={box}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
        className="relative flex w-full max-w-[480px] flex-col items-center gap-2 rounded-lg bg-layer px-8 pb-7 pt-6 text-center shadow-[0_16px_48px_0_var(--shadow-md)] [animation:pop_.15s_ease-out]"
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
