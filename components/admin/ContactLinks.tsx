import { fmtClock, fmtWhen, hasDriver, shiftTime } from "@/components/admin/BookingFormat";
import Icon from "@/components/admin/Icon";
import { btnAccent, btnGhost } from "@/components/admin/ui";
import { phoneDigits, type Booking } from "@/lib/bookingTypes";
import { customerConfirmText, customerDriverText, customerQuoteText, freeCancelHours } from "@/lib/site";

export type MessageKind = "quote" | "confirm";

// The WhatsApp text for a customer: a fare quote (new and contacted
// requests), or a confirmation — with the driver's name, number and call
// time once a car and driver are assigned (Figma 3.6 / 9.3).
export function customerMessage(b: Booking, office: string, kind?: MessageKind, carName?: string) {
  const msgKind = kind ?? (b.status === "new" || b.status === "contacted" ? "quote" : "confirm");
  const trip = { ...b, car: carName ?? b.car };
  if (msgKind === "quote") return customerQuoteText(trip);
  if (!hasDriver(b)) return customerConfirmText(trip);
  const callAt = b.time ? fmtClock(shiftTime(b.date, b.time, -10).time) : undefined;
  const cancel = b.time ? shiftTime(b.date, b.time, -freeCancelHours * 60) : undefined;
  return customerDriverText({
    name: b.name,
    from: b.from,
    to: b.to,
    when: fmtWhen(b),
    driverName: b.driverName ?? "",
    driverMobile: b.driverMobile ?? "",
    callAt,
    quote: b.quote,
    freeCancelUntil: cancel ? (cancel.date === b.date ? fmtClock(cancel.time) : fmtWhen(cancel)) : undefined,
    office,
  });
}

export const waHref = (phone: string, text: string) => {
  const digits = phoneDigits(phone);
  return digits ? `https://wa.me/91${digits}?text=${encodeURIComponent(text)}` : "";
};

// Call + WhatsApp-the-customer buttons (Figma: secondary "Call" + green
// WhatsApp button). WhatsApp opens pre-filled with either a fare quote (new and
// contacted requests) or a confirmation (confirmed trips).
export default function ContactLinks({
  booking,
  office,
  compact = false,
  kind,
  carName,
}: {
  booking: Booking;
  office: string; // office number for the sign-off, "+91 95258 02341"
  compact?: boolean; // short "WhatsApp" label, for rows
  kind?: MessageKind;
  carName?: string;
}) {
  const digits = phoneDigits(booking.phone);
  if (!digits) return <span className="type-body-sm text-helper">No valid phone</span>;
  const msgKind = kind ?? (booking.status === "new" || booking.status === "contacted" ? "quote" : "confirm");
  const text = customerMessage(booking, office, msgKind, carName);
  const waLabel = compact ? "WhatsApp" : msgKind === "quote" ? "Send quote on WhatsApp" : "Send confirmation on WhatsApp";
  return (
    <span className="flex flex-wrap gap-2.5">
      <a href={`tel:+91${digits}`} className={btnGhost}>
        <Icon name="phone" size={16} />
        Call
      </a>
      <a href={waHref(booking.phone, text)} target="_blank" rel="noreferrer" className={btnAccent}>
        <Icon name="whatsapp-logo" size={16} />
        {waLabel}
      </a>
    </span>
  );
}
