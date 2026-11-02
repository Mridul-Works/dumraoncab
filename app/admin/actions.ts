"use server";

import { redirect } from "next/navigation";
import {
  clearFailedSignIns,
  credentialsMatch,
  endSession,
  lockedForMinutes,
  recordFailedSignIn,
  requireAdmin,
  startSession,
} from "@/lib/adminAuth";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/bookingTypes";
import { getCar } from "@/lib/fleet";
import { addBooking, deleteBooking, getBooking, updateBooking } from "@/lib/store";
import { getVendor } from "@/lib/vendors";
import { field, money, refreshAdmin, type FormState } from "./form";

/* ---------------------------------- session ---------------------------------- */

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = field(formData, "email", 120);
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";
  if (!email || !password) return { error: "Enter your email and password.", email };

  // Figma 1.2: five wrong tries lock sign-in from this address for 15 minutes.
  const locked = await lockedForMinutes();
  if (locked) return { error: `Too many wrong tries. Try again in ${locked} min, or ask the owner to reset it.`, email };

  if (!credentialsMatch(email, password)) {
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 800));
    const left = await recordFailedSignIn();
    return {
      error: left
        ? `Incorrect email or password. ${left} ${left === 1 ? "try" : "tries"} left.`
        : "Incorrect email or password. Sign-in is locked for 15 min.",
      email,
    };
  }

  await clearFailedSignIns();
  await startSession(email, password, formData.get("remember") === "on");
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
  // Picking one of our cars in "Car sent" replaces a vendor assignment.
  const before = await getBooking(id);
  const swapsVendor = Boolean(carId && before?.vendorId);

  const saved = await updateBooking(id, {
    quote: money(formData, "quote") || undefined,
    people: people || undefined,
    carId: carId || undefined,
    ...(swapsVendor ? { vendorId: undefined, vendorCarId: undefined, driverName: undefined, driverMobile: undefined, trip: undefined } : {}),
    adminNote: field(formData, "adminNote", 1000),
    // Reopening a cancelled booking clears the reason.
    ...(BOOKING_STATUSES.includes(status) ? { status, ...(status !== "cancelled" ? { cancelReason: undefined } : {}) } : {}),
  });
  if (!saved) return { error: "This booking was deleted." };
  refreshAdmin();
  return { ok: true };
}

// Figma 3.6 "Assign car and driver": one of our own cars with its driver, or
// an approved vendor and one of their cars (the vendor drives).
export type AssignInput =
  | { kind: "own"; carId: string; driverName: string; driverMobile: string }
  | { kind: "vendor"; vendorId: string; vendorCarId: string };

export async function assignBooking(id: string, input: AssignInput): Promise<{ ok?: true; error?: string }> {
  await requireAdmin();
  const booking = await getBooking(id);
  if (!booking) return { error: "This booking was deleted." };

  if (input.kind === "own") {
    const car = await getCar(input.carId);
    if (!car) return { error: "That car is no longer in the fleet." };
    const driverName = input.driverName.trim().slice(0, 80);
    const digits = input.driverMobile.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    if (!driverName) return { error: "Add the driver's name." };
    if (digits.length !== 10) return { error: "Enter all 10 digits of the driver's mobile." };
    await updateBooking(id, {
      carId: car.id,
      car: car.name,
      driverName,
      driverMobile: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
      vendorId: undefined,
      vendorCarId: undefined,
      trip: undefined,
    });
  } else {
    const vendor = await getVendor(input.vendorId);
    const car = vendor?.cars.find((c) => c.id === input.vendorCarId);
    if (!vendor || vendor.status !== "approved") return { error: "That vendor is no longer approved." };
    if (!car) return { error: "That car is no longer on the vendor's list." };
    const sameVendor = booking.vendorId === vendor.id && booking.vendorCarId === car.id;
    await updateBooking(id, {
      vendorId: vendor.id,
      vendorCarId: car.id,
      car: car.model,
      carId: undefined,
      driverName: vendor.name,
      driverMobile: vendor.mobile,
      // A new vendor gets the trip offered in the driver app.
      trip: sameVendor ? booking.trip : { stage: "offered" },
    });
  }
  refreshAdmin();
  return { ok: true };
}

// Figma 3.7 "Cancel booking": the reason feeds the cancellations report.
export async function cancelBooking(id: string, reason: string): Promise<{ ok?: true; error?: string }> {
  await requireAdmin();
  const cancelReason = reason.trim().slice(0, 200);
  if (!cancelReason) return { error: "Choose a reason." };
  const saved = await updateBooking(id, { status: "cancelled", cancelReason });
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
  // Or an approved vendor's car — offered when none of ours are free (Figma 3B.13).
  const vendorId = car ? "" : field(formData, "vendorId", 64);
  const vendor = vendorId ? await getVendor(vendorId) : undefined;
  const vendorCar = vendor?.status === "approved" ? vendor.cars.find((c) => c.id === field(formData, "vendorCarId", 64)) : undefined;
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
    car: car?.name ?? vendorCar?.model ?? field(formData, "carClass", 40),
    carId: car?.id,
    ...(vendor && vendorCar
      ? { vendorId: vendor.id, vendorCarId: vendorCar.id, ...(vendor.kind === "driver" ? { driverName: vendor.name, driverMobile: vendor.mobile } : {}) }
      : {}),
    people: people || undefined,
    quote: money(formData, "quote") || undefined,
    notes: notes.slice(0, 500),
    adminNote: adminNote.slice(0, 1000),
  });
  refreshAdmin();

  // "Booking saved" page (Figma 3B.4), or a fresh form with a toast for "Save and add another".
  const wa = field(formData, "wa", 1) === "1" ? "1" : "0";
  const toast = new URLSearchParams({ saved: booking.id, n: booking.name, wa });
  redirect(field(formData, "then", 20) === "another" ? `/admin/bookings/new?${toast}` : `/admin/bookings/new/saved/${booking.id}?wa=${wa}`);
}
