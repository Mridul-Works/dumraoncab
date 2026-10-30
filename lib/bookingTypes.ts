// Browser-safe booking types & constants (no Node imports) — shared by the
// file store, API routes, and client components.

// new → contacted (called or messaged, quote sent) → confirmed → completed.
export type BookingStatus = "new" | "contacted" | "confirmed" | "completed" | "cancelled";

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
  car: string; // car name as the customer asked for it, or the assigned car's name
  notes: string; // from the customer
  adminNote?: string; // internal — never shown on the public site
  quote?: number; // ₹ quoted to the customer
  people?: number;
  carId?: string; // the specific fleet car assigned by staff
};

export type BookingPatch = Partial<Pick<Booking, "status" | "adminNote" | "quote" | "people" | "carId" | "car">>;

export const BOOKING_STATUSES: BookingStatus[] = ["new", "contacted", "confirmed", "completed", "cancelled"];

// The happy path a booking walks through; "cancelled" sits outside it.
export const STATUS_STEPS: BookingStatus[] = ["new", "contacted", "confirmed", "completed"];

export const STATUS_LABELS: Record<BookingStatus, string> = {
  new: "New",
  contacted: "Contacted",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const SOURCE_LABELS: Record<BookingSource, string> = {
  "hero-widget": "Widget",
  "booking-form": "Form",
  admin: "Phone",
};

export const isWebsiteBooking = (b: Booking) => b.source !== "admin";

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

// Current time in India as "HH:MM".
export function istTime(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

// Sort key for "when does this trip leave" — undated trips last.
export const tripKey = (b: Pick<Booking, "date" | "time">) => `${b.date || "9999-99-99"} ${b.time || "99:99"}`;
