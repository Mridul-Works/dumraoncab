"use client";

import Icon from "@/components/admin/Icon";
import { btnPrimary } from "@/components/admin/ui";

// Opens the browser's print dialog — "Save as PDF" there gives the A4 file to
// send on WhatsApp. Hidden in print.
export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={btnPrimary}>
      <Icon name="file-pdf" size={16} />
      Print or save as PDF
    </button>
  );
}
