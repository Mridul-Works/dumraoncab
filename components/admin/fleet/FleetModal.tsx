"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

// Figma "Modal" with an illustration (Flow 4: 4.8 couldn't save, 4.9 trips
// coming up, 4.10 changed elsewhere): 480 wide, centred art 192×128, h3 title,
// body-sm text, buttons centred. Esc or a click on the scrim closes it.
export default function FleetModal({
  art,
  title,
  children,
  actions,
  onClose,
}: {
  art: "car" | "error";
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>("button, a")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default bg-scrim [animation:fade_.15s_ease-out]" />
      <div
        ref={box}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="fleet-modal-title"
        aria-describedby="fleet-modal-desc"
        className="relative flex w-full max-w-[480px] flex-col items-center gap-2 rounded-lg bg-layer px-6 pb-7 pt-6 text-center shadow-[0_16px_48px_var(--shadow-md)] [animation:pop_.15s_ease-out] sm:px-8"
      >
        <Image
          src={art === "car" ? "/admin-illustrations/fleet-car-modal.svg" : "/admin-illustrations/fleet-load-failed.svg"}
          alt=""
          width={192}
          height={128}
          unoptimized
          className="h-32 w-48"
        />
        <h2 id="fleet-modal-title" className="type-h3 text-primary">
          {title}
        </h2>
        <p id="fleet-modal-desc" className="type-body-sm text-secondary">
          {children}
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-4">{actions}</div>
      </div>
    </div>
  );
}
