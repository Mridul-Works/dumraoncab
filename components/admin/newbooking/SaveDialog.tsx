"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { btnGhost, btnPrimary } from "@/components/admin/ui";

// The modal that answers "Save booking" when it can't simply save (Figma
// 3B.15 Couldn't save, 3B.16 Car busy, 3B.17 Repeat booking): an illustration,
// what happened, and two ways on. The main action is focused; Escape or a
// click outside just closes it.

type Action = { label: string; onClick?: () => void; href?: string };

export default function SaveDialog({
  art,
  artSize,
  title,
  children,
  secondary,
  primary,
  onClose,
}: {
  art: string; // file in public/admin-illustrations, without ".svg"
  artSize: [number, number];
  title: string;
  children: React.ReactNode;
  secondary: { label: string; onClick: () => void };
  primary: Action;
  onClose: () => void; // Escape or a click outside
}) {
  const main = useRef<HTMLButtonElement & HTMLAnchorElement>(null);
  useEffect(() => {
    main.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-scrim [animation:fade_.15s_ease-out]" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="nb-dialog-title"
        aria-describedby="nb-dialog-desc"
        className="relative flex w-full max-w-[480px] flex-col items-center gap-2 rounded-lg bg-layer px-8 pb-7 pt-6 text-center shadow-[0_16px_48px_0_var(--shadow-md)] [animation:pop_.15s_ease-out]"
      >
        <Image
          src={`/admin-illustrations/${art}.svg`}
          alt=""
          width={artSize[0]}
          height={artSize[1]}
          unoptimized
          style={{ width: artSize[0], height: artSize[1] }}
        />
        <h2 id="nb-dialog-title" className="type-h3 text-primary">
          {title}
        </h2>
        <p id="nb-dialog-desc" className="type-body-sm text-secondary">
          {children}
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-4">
          <button type="button" onClick={secondary.onClick} className={btnGhost}>
            {secondary.label}
          </button>
          {primary.href ? (
            <Link ref={main} href={primary.href} className={btnPrimary}>
              {primary.label}
            </Link>
          ) : (
            <button ref={main} type="button" onClick={primary.onClick} className={btnPrimary}>
              {primary.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
