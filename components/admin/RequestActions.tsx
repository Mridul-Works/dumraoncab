"use client";

import Icon from "@/components/admin/Icon";
import { btnAccent, btnGhost, btnPrimary } from "@/components/admin/ui";
import { phoneDigits, type Booking } from "@/lib/bookingTypes";
import { customerQuoteText } from "@/lib/site";

// Where a "Needs a call back" row is in the call flow:
// waiting → Call → called (Figma 2.7: No answer / Mark contacted)
// no-answer (2.11: Call again / WhatsApp) · sending (2.10: queued while offline).
export type RequestState = "waiting" | "called" | "no-answer" | "sending";

// Dashboard "Needs a call back" row actions. Call opens the dialer and the row
// then asks how it went; WhatsApp opens the pre-filled fare quote and marks the
// request Contacted straight away (Figma: "Where each part leads").
export default function RequestActions({
  booking,
  carName,
  state = "waiting",
  onCall,
  onWhatsApp,
  onNoAnswer,
  onContacted,
}: {
  booking: Booking;
  carName?: string;
  state?: RequestState;
  onCall?: () => void;
  onWhatsApp?: () => void;
  onNoAnswer?: () => void;
  onContacted?: () => void;
}) {
  const digits = phoneDigits(booking.phone);

  if (state === "called") {
    return (
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={onNoAnswer} className={btnGhost}>
          No answer
        </button>
        <button type="button" onClick={onContacted} className={btnPrimary}>
          Mark contacted
        </button>
      </div>
    );
  }

  if (!digits) return <span className="type-body-sm text-helper">No valid phone</span>;

  const quote = customerQuoteText({ ...booking, car: carName ?? booking.car });
  const off = state === "sending";
  // While the change waits to send, the buttons stay visible but inactive.
  const inert = off ? "pointer-events-none opacity-40" : "";
  return (
    <div className="flex shrink-0 gap-2" aria-disabled={off || undefined}>
      <a href={`tel:+91${digits}`} onClick={onCall} tabIndex={off ? -1 : undefined} className={`${btnGhost} ${inert}`}>
        <Icon name="phone" />
        {state === "no-answer" ? "Call again" : "Call"}
      </a>
      <a
        href={`https://wa.me/91${digits}?text=${encodeURIComponent(quote)}`}
        target="_blank"
        rel="noreferrer"
        onClick={onWhatsApp}
        tabIndex={off ? -1 : undefined}
        className={`${btnAccent} ${inert}`}
      >
        <Icon name="whatsapp-logo" />
        WhatsApp
      </a>
    </div>
  );
}
