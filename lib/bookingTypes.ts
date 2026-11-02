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
  // Who drives it (Figma 3.6): our own driver, or an approved vendor + one of their cars.
  vendorId?: string;
  vendorCarId?: string;
  driverName?: string;
  driverMobile?: string;
  cancelReason?: string; // Figma 3.7
  // Driver app progress once a vendor is assigned (Figma Flow 10).
  trip?: DriverTrip;
};

// Driver-side trip state, written by the driver app (/driver).
export type DriverTripStage = "offered" | "accepted" | "declined" | "to-pickup" | "waiting" | "on-trip" | "ended" | "paid";

export type DriverTrip = {
  stage: DriverTripStage;
  declineReason?: string;
  startKm?: number;
  endKm?: number;
  startedAt?: string;
  endedAt?: string;
  expenses?: { kind: string; amount: number; note?: string; receipt?: string; at?: string }[];
  collected?: number; // ₹ received from the customer
  payment?: "cash" | "upi" | "office"; // "office" = Pay the office later (10.33)
  officeNote?: string; // "Office asked to fix"
  approved?: boolean; // office checked the entry (Figma 4B.5–4B.7)
  // Driver app (Figma Flow 10) — all optional:
  share?: number; // ₹ the driver's share, set by staff when assigning (shown instead of the fare)
  offeredAt?: string; // ISO, when the request was sent (10-minute answer window)
  answeredAt?: string;
  startPhoto?: string; // meter photos, upload names served by /uploads/[file]
  endPhoto?: string;
  arrivedAt?: string;
  whatsappAt?: string; // driver sent "your cab is here" from their phone
  boardedAt?: string;
  noShowAt?: string; // driver told the office the customer is not coming (10.28)
  paidAt?: string;
  entryId?: string; // Trip log entry made by Send to office (10.36)
  sentAt?: string;
  cashHandedOver?: boolean; // office marked the cash as received (10.43)
  cancelSeen?: boolean; // driver closed the "Trip cancelled" screen (10.40)
  location?: { lat: number; lng: number; at: string }; // last position while on a trip
  locationOff?: boolean; // 10.26: location is off on the driver's phone
};

export type BookingPatch = Partial<
  Pick<
    Booking,
    "status" | "adminNote" | "quote" | "people" | "carId" | "car" | "vendorId" | "vendorCarId" | "driverName" | "driverMobile" | "cancelReason" | "trip"
  >
>;

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
