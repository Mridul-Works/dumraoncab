// Browser-safe Trip log types and helpers (no Node imports) — shared by the
// store (lib/journal.ts), server actions, the admin Trip log and the driver app.

import type { JournalEntry } from "./catalogTypes";

// Who wrote the entry: office staff in the admin, or a driver in the driver app.
export type EntrySource = "staff" | "driver";

// Driver entries only: submitted → approved, or submitted → fix → submitted …
// Staff entries have no status (they count straight away).
export type EntryStatus = "submitted" | "fix" | "approved";

// What the office asked the driver to fix (Figma 4B.6).
export type FixReason = "receipt" | "meter" | "other";

// A cost the driver paid on the trip and added to the customer's bill
// (toll, parking …), with a photo of the receipt.
export type EntryExpense = {
  kind: string; // "Toll", "Parking", "Food" …
  place?: string; // "Koilwar plaza"
  amount: number; // ₹
  receipt?: string; // stored upload name, served by /uploads/[file]
  at?: string; // ISO time the receipt was added
};

// How the customer paid at the end of the trip.
export type EntryPayment = {
  method: "upi" | "cash";
  amount: number; // ₹ collected (fare + expenses)
  to?: string; // UPI id it went to, e.g. "dumraoncab@okicici"
  at?: string; // ISO
  received: boolean; // false = "Payment pending"
};

// The stored record: a JournalEntry plus the details the entry panel and the
// driver app capture. `km` stays the total distance run (both legs of a round trip).
export type JournalRecord = JournalEntry & {
  phone?: string; // customer's 10-digit mobile
  roundTrip?: boolean; // there and back
  // Odometer (driver entries; optional): readings at the start and end of the trip.
  odoStart?: number;
  odoEnd?: number;
  odoStartPhoto?: string; // upload names, served by /uploads/[file]
  odoEndPhoto?: string;
  startedAt?: string; // ISO, when the start reading was taken
  endedAt?: string; // ISO, when the end reading was taken
  routeKm?: number; // expected distance for the route, to check the meter against
  // Driver entries (Figma 4B.5–4B.7)
  source?: EntrySource; // missing = "staff"
  status?: EntryStatus;
  vendorId?: string; // who logged it (lib/vendors.ts)
  expenses?: EntryExpense[];
  payment?: EntryPayment;
  fixReason?: FixReason;
  fixNote?: string; // message the office sent back to the driver
  submittedAt?: string; // ISO, last (re)submission by the driver
  reviewedAt?: string; // ISO, last office decision
};

// Whether the entry counts in the Trip log totals: staff entries always,
// driver entries once the office approved them.
export const counts = (e: Pick<JournalRecord, "source" | "status">) => e.source !== "driver" || e.status === "approved";

// A driver entry waiting for the office to check it.
export const needsCheck = (e: Pick<JournalRecord, "source" | "status">) => e.source === "driver" && e.status === "submitted";

// Total of the driver's extra costs (added to the customer's bill).
export const expensesTotal = (e: Pick<JournalRecord, "expenses">) => (e.expenses ?? []).reduce((sum, x) => sum + x.amount, 0);

// Distance on the meter, when both readings are there.
export const meterKm = (e: Pick<JournalRecord, "odoStart" | "odoEnd">) =>
  e.odoStart != null && e.odoEnd != null && e.odoEnd >= e.odoStart ? e.odoEnd - e.odoStart : undefined;

// What the driver app sends (lib/journal.ts → addDriverEntry / resubmitDriverEntry).
export type DriverEntryInput = {
  vendorId: string;
  carId: string; // the vendor car's id (VendorCar.id) or a fleet car id
  date: string; // YYYY-MM-DD (IST)
  bookingId?: string;
  customer?: string;
  phone?: string; // 10 digits
  from: string;
  to: string;
  roundTrip?: boolean;
  km?: number; // total km run; defaults to odoEnd − odoStart
  routeKm?: number;
  odoStart?: number;
  odoEnd?: number;
  odoStartPhoto?: string;
  odoEndPhoto?: string;
  startedAt?: string;
  endedAt?: string;
  fare: number; // ₹ trip fare (without expenses)
  fuel?: number; // ₹
  driverCut?: number; // ₹ the driver's share
  expenses?: EntryExpense[];
  payment?: EntryPayment;
  note?: string;
};
