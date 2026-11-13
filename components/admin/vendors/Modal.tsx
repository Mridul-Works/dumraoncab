"use client";

import { useEffect, useRef } from "react";
import Icon from "@/components/admin/Icon";
import { Art, type ArtName } from "./parts";

// Centred confirm dialog (Figma 6.13 / 6.16 / 6.18 / 6.20): scrim, a round tone
// icon, title + subtitle, body and a right-aligned button row. Escape or a
// click on the scrim closes it. `StateModal` below is the illustrated variant
// for "Couldn’t approve" (6.15) and "Already approved elsewhere" (6.22).
const toneCls = {
  good: "bg-tag-green text-brand",
  bad: "bg-tag-red text-error",
  warn: "bg-tag-amber text-tag-amber",
} as const;

// Scrim + focus, Escape and scroll lock shared by both dialogs.
function useDialog(onClose: () => void) {
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []);
  return box;
}

function Shell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 cursor-default bg-scrim [animation:fade_.15s_ease-out]" />
      {children}
    </div>
  );
}

const boxCls = "relative my-auto flex w-full flex-col rounded-xl bg-layer shadow-[0_24px_64px_-8px_var(--shadow-lg),0_8px_16px_-4px_var(--shadow-sm)] outline-none [animation:pop_.15s_ease-out]";

export default function Modal({
  icon,
  tone,
  title,
  subtitle,
  children,
  footer,
  onClose,
  width = "max-w-[540px]",
}: {
  icon: string;
  tone: keyof typeof toneCls;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  footer: React.ReactNode;
  onClose: () => void;
  width?: string;
}) {
  const box = useDialog(onClose);

  return (
    <Shell onClose={onClose}>
      <div ref={box} role="dialog" aria-modal="true" tabIndex={-1} className={`${boxCls} ${width} gap-4 p-5 sm:p-7`}>
        <div className="flex items-start gap-4">
          <span className={`grid size-11 shrink-0 place-items-center rounded-full ${toneCls[tone]}`}>
            <Icon name={icon} size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="type-h4 text-primary">{title}</h2>
            {subtitle && <p className="mt-1 type-body-sm text-secondary">{subtitle}</p>}
          </div>
        </div>
        {children}
        <div className="flex flex-wrap justify-end gap-2.5">{footer}</div>
      </div>
    </Shell>
  );
}

// Illustration, title, text and a centred button row (Figma 6.15, 6.22).
export function StateModal({
  art,
  title,
  children,
  footer,
  onClose,
}: {
  art: ArtName;
  title: React.ReactNode;
  children?: React.ReactNode;
  footer: React.ReactNode;
  onClose: () => void;
}) {
  const box = useDialog(onClose);
  return (
    <Shell onClose={onClose}>
      <div ref={box} role="alertdialog" aria-modal="true" tabIndex={-1} className={`${boxCls} max-w-[480px] items-center gap-2 px-6 pb-7 pt-6 text-center sm:px-8`}>
        <Art name={art} className="h-32 w-48" />
        <h2 className="type-h3 text-primary">{title}</h2>
        {children && <p className="type-body-sm text-secondary">{children}</p>}
        <div className="flex flex-wrap justify-center gap-3 pt-4">{footer}</div>
      </div>
    </Shell>
  );
}
