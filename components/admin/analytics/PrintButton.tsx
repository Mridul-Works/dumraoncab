"use client";

import { useEffect } from "react";
import Icon from "@/components/admin/Icon";
import { btnPrimary } from "@/components/admin/ui";

// "Save as PDF" on the printable analytics report. With `auto`, the browser's
// print dialog (Save as PDF) opens as soon as the page loads.
export default function PrintButton({ auto }: { auto?: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [auto]);

  return (
    <button type="button" onClick={() => window.print()} className={`${btnPrimary} print:hidden`}>
      <Icon name="download-simple" size={16} />
      Save as PDF
    </button>
  );
}
