"use client";

import { useEffect, useRef, useState } from "react";
import JournalToast from "@/components/admin/JournalToast";
import { btnGhost } from "@/components/admin/ui";

// Daily Diary "Export" (Figma 4B.10): a menu with the CSV (opens in Excel) and
// a PDF summary for the accountant, both for the range and car on screen.
// The CSV is fetched here so a failure can say so and keep the filters
// (4B.13 "Couldn't make the CSV. Your filters are kept. Try again").
export default function ExportMenu({ csvHref, pdfHref, scope }: { csvHref: string; pdfHref: string; scope: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
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

  async function downloadCsv() {
    setOpen(false);
    setFailed(false);
    setBusy(true);
    try {
      const res = await fetch(csvHref, { cache: "no-store" });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "daily-diary.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const item = "flex w-full flex-col items-start rounded-md px-3 py-2 text-left hover:bg-layer-hover";

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" disabled={busy} className={btnGhost}>
        {busy ? "Exporting…" : "Export"}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-30 flex w-[min(340px,calc(100vw-2rem))] flex-col gap-0.5 rounded-lg border border-gray-100 bg-layer p-2 shadow-[0_16px_48px_0_var(--shadow-md)] [animation:pop_.15s_ease-out]"
        >
          <button type="button" role="menuitem" onClick={downloadCsv} className={item}>
            <span className="type-ui text-primary">Download CSV</span>
            <span className="type-body-sm text-secondary">{scope} · opens in Excel</span>
          </button>
          <a role="menuitem" href={pdfHref} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className={item}>
            <span className="type-ui text-primary">Download PDF summary</span>
            <span className="type-body-sm text-secondary">Totals, by car and every trip, for the accountant</span>
          </a>
          <p className="px-3 pb-1.5 pt-2 type-body-sm text-secondary">Change the range or car first to export something else.</p>
        </div>
      )}

      {failed && (
        <JournalToast
          center
          tone="bad"
          message="Couldn’t make the CSV. Your filters are kept."
          action={{ label: "Try again", onClick: downloadCsv }}
          onClose={() => setFailed(false)}
        />
      )}
    </div>
  );
}
