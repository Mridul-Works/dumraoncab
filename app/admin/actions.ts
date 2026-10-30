"use server";

import { redirect } from "next/navigation";
import { credentialsMatch, endSession, requireAdmin, startSession } from "@/lib/adminAuth";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/bookingTypes";
import { getCar } from "@/lib/fleet";
import { addBooking, deleteBooking, updateBooking } from "@/lib/store";
import { field, money, refreshAdmin, type FormState } from "./form";

/* ---------------------------------- session ---------------------------------- */

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = field(formData, "email", 120);
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";
  if (!email || !password) return { error: "Enter your email and password.", email };

  if (!credentialsMatch(email, password)) {
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Incorrect email or password. Try again.", email };
  }

  await startSession(email, password);
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

/* ---------------------------------- bookings ---------------------------------- */

export async function setBookingStatus(id: string, status: BookingStatus) {
  await requireAdmin();
  if (!BOOKING_STATUSES.includes(status)) return;
  await updateBooking(id, { status });
  refreshAdmin();
}

// Booking drawer: quote, car sent, people and internal note in one save. The
// status buttons (step control, "Mark contacted", "Mark confirmed"…) submit the
// same form with a "setStatus" value, so edits made before the click are kept.
export async function saveBookingDetails(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = field(formData, "id", 64);
  const carId = field(formData, "carId", 64);
  if (carId && !(await getCar(carId))) return { error: "That car is no longer in the fleet." };
  const people = money(formData, "people", 60);
  const status = field(formData, "setStatus", 20) as BookingStatus;

  const saved = await updateBooking(id, {
    quote: money(formData, "quote") || undefined,
    people: people || undefined,
    carId: carId || undefined,
    adminNote: field(formData, "adminNote", 1000),
    ...(BOOKING_STATUSES.includes(status) ? { status } : {}),
  });
  if (!saved) return { error: "This booking was deleted." };
  refreshAdmin();
  return { ok: true };
}

export async function removeBooking(id: string) {
  await requireAdmin();
  await deleteBooking(id);
  refreshAdmin();
}

// New booking page: a trip that came in by phone or direct WhatsApp, so every
// booking lives in one list.
export async function createBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const from = field(formData, "from");
  const service = field(formData, "service", 60);
  if (!service) return { error: "Choose a service." };
  if (!from) return { error: "Add a pickup point." };

  // Mobile: 10 digits (shown as "+91 94311 80276"). Walk-ins may have none.
  const channel = field(formData, "channel", 20);
  const rawPhone = field(formData, "phone", 20);
  const digits = rawPhone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  if (rawPhone && digits.length !== 10) return { error: "Enter all 10 digits of the mobile number." };
  if (!rawPhone && channel !== "walk-in") return { error: "Add the customer's mobile number." };
  const phone = digits ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : "";

  const carId = field(formData, "carId", 64);
  const car = carId ? await getCar(carId) : undefined;
  const status = field(formData, "status", 20) as BookingStatus;
  const people = money(formData, "people", 60);
  const bags = money(formData, "bags", 30);

  // Extras the booking record has no field for go into the notes:
  // driver-facing ones into notes, office-only ones into the internal note.
  const join = (parts: (string | false)[]) => parts.filter(Boolean).join(" · ");
  const flight = field(formData, "flight", 80);
  const notes = join([
    field(formData, "notes", 400),
    field(formData, "direction", 20) === "round" && "Round trip",
    !!flight && `Flight/train: ${flight}`,
    bags > 0 && `${bags} bag${bags === 1 ? "" : "s"}`,
  ]);
  const channelLabel = { phone: "Phone call", whatsapp: "WhatsApp", "walk-in": "Walk-in" }[channel];
  const payment = field(formData, "payment", 20);
  const adminNote = join([
    field(formData, "adminNote", 800),
    !!channelLabel && `Via ${channelLabel.toLowerCase()}`,
    !!payment && `Payment: ${payment}`,
  ]);

  const booking = await addBooking({
    source: "admin",
    status: BOOKING_STATUSES.includes(status) ? status : "confirmed",
    service,
    name: field(formData, "name", 80),
    phone,
    from,
    to: field(formData, "to"),
    date: field(formData, "date", 20),
    time: field(formData, "time", 20),
    // A specific car, else the class asked for ("SUV / MUV")
    car: car?.name ?? field(formData, "carClass", 40),
    carId: car?.id,
    people: people || undefined,
    quote: money(formData, "quote") || undefined,
    notes: notes.slice(0, 500),
    adminNote: adminNote.slice(0, 1000),
  });
  refreshAdmin();

  // Back to the list with a "Booking saved" toast (or a fresh form for "Save and add another").
  const toast = new URLSearchParams({ saved: booking.id, n: booking.name, wa: field(formData, "wa", 1) === "1" ? "1" : "0" });
  redirect(field(formData, "then", 20) === "another" ? `/admin/bookings/new?${toast}` : `/admin/bookings?${toast}`);
}
