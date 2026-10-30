"use client";

import { useRouter } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { btnAccent, btnGhost } from "@/components/admin/ui";
import { phoneDigits, type Booking } from "@/lib/bookingTypes";
import { customerQuoteText } from "@/lib/site";

// Dashboard "Needs a call back" row actions: Call opens the dialer, WhatsApp
// opens the pre-filled fare quote. Either one moves a new request to
// Contacted (Figma: "Where each part leads").
export default function RequestActions({ booking, carName }: { booking: Booking; carName?: string }) {
  const router = useRouter();
  const digits = phoneDigits(booking.phone);
  if (!digits) return <span className="type-body-sm text-helper">No valid phone</span>;

  const markContacted = () => {
    if (booking.status !== "new") return;
    fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "contacted" }),
      keepalive: true,
    })
      .then(() => router.refresh())
      .catch(() => {});
  };

  const quote = customerQuoteText({ ...booking, car: carName ?? booking.car });
  return (
    <div className="flex shrink-0 gap-2">
      <a href={`tel:+91${digits}`} onClick={markContacted} className={btnGhost}>
        <Icon name="phone" />
        Call
      </a>
      <a href={`https://wa.me/91${digits}?text=${encodeURIComponent(quote)}`} target="_blank" rel="noreferrer" onClick={markContacted} className={btnAccent}>
        <Icon name="whatsapp-logo" />
        WhatsApp
      </a>
    </div>
  );
}
