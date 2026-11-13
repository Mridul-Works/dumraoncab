"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Icon from "@/components/admin/Icon";
import { btnGhost, btnPrimary } from "@/components/admin/ui";

// Analytics "Export" (Figma 7.3), the report-sent toast (7.5) and the
// "Couldn't send the report" dialog (7.7).
// There is no WhatsApp API here: "Send on WhatsApp" opens WhatsApp (wa.me)
// with the report summary and a link to the PDF report, ready to send. It
// counts as not sent when the browser is offline or blocks the new tab.

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
  const [failed, setFailed] = useState(false);
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

  function sendOnWhatsApp() {
    setOpen(false);
    setSent(false);
    const w = navigator.onLine ? window.open(waHref, "_blank") : null;
    if (!w) {
      setFailed(true);
      return;
    }
    w.opener = null;
    setFailed(false);
    setSent(true);
  }

  const item = "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-layer-hover";

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
          <button type="button" role="menuitem" onClick={sendOnWhatsApp} className={item}>
            <Icon name="whatsapp-logo" size={18} className="text-[var(--icon-primary)]" />
            <span className="min-w-0 flex-1">
              <span className="block type-ui text-primary">Send on WhatsApp</span>
              <span className="block type-body-sm text-secondary">PDF report to the owner, {ownerLine}</span>
            </span>
          </button>
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
          <p className="min-w-0 flex-1 type-ui text-primary">Report for {rangeLabel} sent to WhatsApp for the owner · tap send there</p>
          <a href={pdfHref} target="_blank" rel="noreferrer" className="shrink-0 type-ui text-link hover:text-link-hover">
            View PDF
          </a>
          <span className="h-5 w-px shrink-0 bg-gray-200" aria-hidden="true" />
          <button type="button" onClick={() => setSent(false)} aria-label="Dismiss" className="shrink-0 text-[var(--icon-secondary)] hover:text-primary">
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      {/* 7.7 — the report didn't go out */}
      {failed && <SendFailed rangeLabel={rangeLabel} csvHref={csvHref} onRetry={sendOnWhatsApp} onClose={() => setFailed(false)} />}
    </div>
  );
}

function SendFailed({ rangeLabel, csvHref, onRetry, onClose }: { rangeLabel: string; csvHref: string; onRetry: () => void; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 cursor-default bg-scrim [animation:fade_.15s_ease-out]" />
      <div
        ref={box}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="report-failed-title"
        aria-describedby="report-failed-body"
        tabIndex={-1}
        className="relative my-auto flex w-full max-w-[480px] flex-col items-center gap-2 rounded-lg bg-layer px-6 pb-7 pt-6 text-center shadow-[0_16px_48px_0_var(--shadow-md)] outline-none [animation:pop_.15s_ease-out] sm:px-8"
      >
        <Image src="/admin-illustrations/analytics-empty.svg" alt="" width={192} height={128} unoptimized className="h-32 w-48" />
        <h2 id="report-failed-title" className="type-h3 text-primary">
          Couldn’t send the report
        </h2>
        <p id="report-failed-body" className="type-body-sm text-secondary">
          The report for {rangeLabel} didn’t go out, maybe a weak connection. Try again, or download it to this computer instead.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-4">
          <a href={csvHref} download onClick={onClose} className={btnGhost}>
            Download CSV
          </a>
          <button type="button" onClick={onRetry} className={btnPrimary}>
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
