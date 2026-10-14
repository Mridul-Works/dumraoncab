// Browser-safe booking types & constants (no Node imports) — shared by the
// file store, API routes, and client components.

export type BookingStatus = "new" | "confirmed" | "completed" | "cancelled";

// hero-widget / booking-form come from the public site; "admin" is a trip
// logged by staff from a phone call or direct WhatsApp.
export type BookingSource = "hero-widget" | "booking-form" | "admin";

export type Booking = {
  id: string;
  createdAt: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp of the last admin change
  status: BookingStatus;
  source: BookingSource;
  service: string;
  name: string;
  phone: string;
  from: string;
  to: string;
  date: string;
  time: string;
  car: string;
  notes: string; // from the customer
  adminNote?: string; // internal — never shown on the public site
};

export const BOOKING_STATUSES: BookingStatus[] = ["new", "confirmed", "completed", "cancelled"];

export const SOURCE_LABELS: Record<BookingSource, string> = {
  "hero-widget": "Widget",
  "booking-form": "Form",
  admin: "Phone",
};

// Last 10 digits of an Indian mobile number, or "" if there aren't enough.
export function phoneDigits(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : "";
}

// The business runs on Indian time; "today" must not flip at 05:30 IST.
// Pass an ISO timestamp to convert it, or a number of days from now.
export function istDate(at: string | number = 0): string {
  const ms = typeof at === "string" ? Date.parse(at) : Date.now() + at * 24 * 60 * 60 * 1000;
  return new Date(ms + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
