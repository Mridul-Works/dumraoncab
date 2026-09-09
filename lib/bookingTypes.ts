// Browser-safe booking types & constants (no Node imports) — shared by the
// file store, API routes, and client components.

export type BookingStatus = "new" | "confirmed" | "completed" | "cancelled";

export type Booking = {
  id: string;
  createdAt: string; // ISO timestamp
  status: BookingStatus;
  source: "hero-widget" | "booking-form";
  service: string;
  name: string;
  phone: string;
  from: string;
  to: string;
  date: string;
  time: string;
  car: string;
  notes: string;
};

export const BOOKING_STATUSES: BookingStatus[] = ["new", "confirmed", "completed", "cancelled"];
