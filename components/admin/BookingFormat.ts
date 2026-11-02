import type { Booking } from "@/lib/bookingTypes";

// Display helpers for the bookings list and drawer (browser-safe).

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const parts = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return { y, m, day, dow: new Date(Date.UTC(y, m - 1, day)).getUTCDay() };
};

// "2026-11-02" → "02 Nov 2026"
export function fmtDate(d: string) {
  if (!d) return "No date";
  const p = parts(d);
  return `${String(p.day).padStart(2, "0")} ${MONTHS[p.m - 1]} ${p.y}`;
}

// "2026-11-02" → "Sun, 02 Nov 2026"
export const fmtLongDate = (d: string) => (d ? `${DAYS[parts(d).dow]}, ${fmtDate(d)}` : "No date");

// "2026-11-02" → "02 Nov"
export const fmtShortDate = (d: string) => (d ? fmtDate(d).slice(0, 6) : "");

// "17:30" → "05:30 PM"
export function fmtTime(t: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  const h = Number(m[1]);
  return `${String(h % 12 || 12).padStart(2, "0")}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

// ISO timestamp → "29 Oct, 10:42 AM" (Indian time)
export function fmtReceived(iso: string) {
  const ist = new Date(Date.parse(iso) + 5.5 * 60 * 60 * 1000).toISOString();
  return `${ist.slice(8, 10)} ${MONTHS[Number(ist.slice(5, 7)) - 1]}, ${fmtTime(ist.slice(11, 16))}`;
}

// Where the request came from, as the design shows it (mono id).
export const sourceId = (b: Booking) => (b.source === "admin" ? "phone-call" : b.source);

// "Dumraon → Patna Airport", or just the pickup for local trips.
export const route = (b: Booking) => (b.to ? `${b.from} → ${b.to}` : b.from);

// Short reference printed on the booking PDF and shown in WhatsApp file names: "DC-3F9A1C".
export const bookingRef = (b: Pick<Booking, "id">) => `DC-${b.id.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase()}`;

// "17:30" → "5:30 PM" (no leading zero, as on the slip and in WhatsApp texts)
export const fmtClock = (t: string) => fmtTime(t).replace(/^0/, "");

// "2026-11-02" → "Mon 2 Nov"
export function fmtDay(d: string) {
  if (!d) return "";
  const p = parts(d);
  return `${DAYS[p.dow]} ${p.day} ${MONTHS[p.m - 1]}`;
}

// Shift a trip's date + "HH:MM" by some minutes (may cross midnight).
export function shiftTime(d: string, t: string, minutes: number): { date: string; time: string } {
  const ms = Date.parse(`${d || "2000-01-01"}T${t}:00Z`) + minutes * 60_000;
  const iso = new Date(ms).toISOString();
  return { date: d ? iso.slice(0, 10) : "", time: iso.slice(11, 16) };
}

// "Mon 2 Nov, 5:30 AM" — empty parts dropped.
export const fmtWhen = (b: Pick<Booking, "date" | "time">) => [fmtDay(b.date), b.time ? fmtClock(b.time) : ""].filter(Boolean).join(", ");

// Extras the phone-booking form folds into the notes ("Round trip · Flight/train: 6E 2134 · 3 bags").
export function tripExtras(b: Pick<Booking, "notes">) {
  const n = b.notes ?? "";
  const bags = /(\d+) bags?/i.exec(n);
  const flight = /Flight\/train:\s*([^·\n]+)/i.exec(n);
  return { roundTrip: /round trip/i.test(n), bags: bags ? Number(bags[1]) : 0, flight: flight ? flight[1].trim() : "" };
}

// Who drives the trip, for the drawer, slip and messages.
export const hasDriver = (b: Pick<Booking, "driverName" | "driverMobile">) => Boolean(b.driverName && b.driverMobile);
export const pdfHref = (id: string, copy: "customer" | "driver") => `/admin/bookings/${id}/pdf?copy=${copy}`;
