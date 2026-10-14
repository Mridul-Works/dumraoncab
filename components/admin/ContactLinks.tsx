import { phoneDigits, type Booking } from "@/lib/bookingTypes";
import { customerConfirmText } from "@/lib/site";

// Call + WhatsApp-the-customer buttons. WhatsApp opens with a pre-filled confirmation.
export default function ContactLinks({ booking, compact = false }: { booking: Booking; compact?: boolean }) {
  const digits = phoneDigits(booking.phone);
  if (!digits) return <span className="text-xs text-sand">No valid phone</span>;
  const pill = compact
    ? "rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-ink hover:border-amber hover:text-amberdeep"
    : "rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink hover:border-amber hover:text-amberdeep";
  return (
    <span className="flex flex-wrap gap-1.5">
      <a href={`tel:+91${digits}`} className={pill}>
        Call
      </a>
      <a
        href={`https://wa.me/91${digits}?text=${encodeURIComponent(customerConfirmText(booking))}`}
        target="_blank"
        rel="noreferrer"
        className={pill}
      >
        WhatsApp
      </a>
    </span>
  );
}
