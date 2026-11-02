"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/admin/Icon";
import { btnGhost } from "@/components/admin/ui";

// Analytics "Export" (Figma 7.3) and the report-sent toast (7.5).
// There is no WhatsApp API here: "Send on WhatsApp" opens WhatsApp (wa.me)
// with the report summary and a link to the PDF report, ready to send.

export default function ExportMenu({
  csvHref,
  pdfHref,
  waHref,
  ownerLine,
  rangeLabel,
}: {
  csvHref: string;
  pdfHref: string;
  waHref: string;
  ownerLine: string; // "+91 94311 00700"
  rangeLabel: string; // "1 to 30 Oct"
}) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => setSent(false), 8000);
    return () => clearTimeout(t);
  }, [sent]);

  const item = "flex items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-layer-hover";

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className={btnGhost}>
        <Icon name="download-simple" size={16} />
        Export
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-30 flex w-[min(320px,calc(100vw-2rem))] flex-col gap-0.5 rounded-lg border border-gray-100 bg-layer p-2 shadow-[0_16px_48px_0_var(--shadow-md)] [animation:pop_.15s_ease-out]"
        >
          <a role="menuitem" href={csvHref} download onClick={() => setOpen(false)} className={item}>
            <Icon name="file-text" size={18} className="text-[var(--icon-primary)]" />
            <span className="min-w-0 flex-1">
              <span className="block type-ui text-primary">Download CSV</span>
              <span className="block type-body-sm text-secondary">Every booking and trip entry in this range</span>
            </span>
          </a>
          <a role="menuitem" href={pdfHref} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className={item}>
            <Icon name="download-simple" size={18} className="text-[var(--icon-primary)]" />
            <span className="min-w-0 flex-1">
              <span className="block type-ui text-primary">Download PDF report</span>
              <span className="block type-body-sm text-secondary">One-page summary for the accountant</span>
            </span>
          </a>
          <span className="my-px h-px bg-gray-100" aria-hidden="true" />
          <a
            role="menuitem"
            href={waHref}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              setOpen(false);
              setSent(true);
            }}
            className={item}
          >
            <Icon name="whatsapp-logo" size={18} className="text-[var(--icon-primary)]" />
            <span className="min-w-0 flex-1">
              <span className="block type-ui text-primary">Send on WhatsApp</span>
              <span className="block type-body-sm text-secondary">PDF report to the owner, {ownerLine}</span>
            </span>
          </a>
        </div>
      )}

      {/* 7.5 — report handed to WhatsApp */}
      {sent && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-30 flex items-center gap-3 rounded-lg border border-gray-100 bg-layer py-3 pl-3.5 pr-3 drop-shadow-[0_16px_24px_var(--shadow-md)] sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-max sm:-translate-x-1/2 md:left-[calc(50%+124px)]"
        >
          <span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-brand text-on-color">
            <Icon name="check" size={14} />
          </span>
          <p className="min-w-0 flex-1 type-ui text-primary">Report for {rangeLabel} opened in WhatsApp for the owner · tap send there</p>
          <a href={pdfHref} target="_blank" rel="noreferrer" className="shrink-0 type-ui text-link hover:text-link-hover">
            View PDF
          </a>
          <span className="h-5 w-px shrink-0 bg-gray-200" aria-hidden="true" />
          <button type="button" onClick={() => setSent(false)} aria-label="Dismiss" className="shrink-0 text-[var(--icon-secondary)] hover:text-primary">
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
