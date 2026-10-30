import Icon from "@/components/admin/Icon";
import { btnAccent, btnGhost } from "@/components/admin/ui";
import { phoneDigits, type Booking } from "@/lib/bookingTypes";
import { customerConfirmText, customerQuoteText } from "@/lib/site";

// Call + WhatsApp-the-customer buttons (Figma: secondary "Call" + green
// WhatsApp button). WhatsApp opens pre-filled with either a fare quote (new and
// contacted requests) or a confirmation (confirmed trips).
export default function ContactLinks({
  booking,
  compact = false,
  kind,
  carName,
}: {
  booking: Booking;
  compact?: boolean; // short "WhatsApp" label, for rows
  kind?: "quote" | "confirm";
  carName?: string;
}) {
  const digits = phoneDigits(booking.phone);
  if (!digits) return <span className="type-body-sm text-helper">No valid phone</span>;
  const msgKind = kind ?? (booking.status === "new" || booking.status === "contacted" ? "quote" : "confirm");
  const trip = { ...booking, car: carName ?? booking.car };
  const text = msgKind === "quote" ? customerQuoteText(trip) : customerConfirmText(trip);
  const waLabel = compact ? "WhatsApp" : msgKind === "quote" ? "Send quote on WhatsApp" : "Send confirmation on WhatsApp";
  return (
    <span className="flex flex-wrap gap-2.5">
      <a href={`tel:+91${digits}`} className={btnGhost}>
        <Icon name="phone" size={16} />
        Call
      </a>
      <a href={`https://wa.me/91${digits}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className={btnAccent}>
        <Icon name="whatsapp-logo" size={16} />
        {waLabel}
      </a>
    </span>
  );
}
