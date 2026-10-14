"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminConfigured, credentialsMatch, endSession, requireAdmin, startSession } from "@/lib/adminAuth";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/bookingTypes";
import { addBooking, deleteBooking, updateBooking } from "@/lib/store";

export type FormState = { error?: string; ok?: boolean; email?: string } | undefined;

const field = (fd: FormData, key: string, max = 200) => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
};

const refreshAdmin = () => revalidatePath("/admin", "layout");

/* ---------------------------------- session ---------------------------------- */

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!adminConfigured()) {
    return { error: "Admin login isn't set up yet — ADMIN_PASSWORD is missing on the server." };
  }
  const email = field(formData, "email", 120);
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";
  if (!email || !password) return { error: "Enter your email and password.", email };

  if (!credentialsMatch(email, password)) {
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 800));
    return { error: "That email and password don't match.", email };
  }

  await startSession(email);
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

export async function saveBookingNote(id: string, note: string) {
  await requireAdmin();
  await updateBooking(id, { adminNote: String(note).trim().slice(0, 1000) });
  refreshAdmin();
}

export async function removeBooking(id: string) {
  await requireAdmin();
  await deleteBooking(id);
  refreshAdmin();
}

// Log a trip that came in by phone or direct WhatsApp, so every booking lives in one list.
export async function createBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const from = field(formData, "from");
  const service = field(formData, "service", 60);
  if (!from || !service) return { error: "Pickup and service are required." };

  const status = field(formData, "status", 20) as BookingStatus;
  await addBooking({
    source: "admin",
    status: BOOKING_STATUSES.includes(status) ? status : "confirmed",
    service,
    name: field(formData, "name", 80),
    phone: field(formData, "phone", 20),
    from,
    to: field(formData, "to"),
    date: field(formData, "date", 20),
    time: field(formData, "time", 20),
    car: field(formData, "car", 60),
    notes: field(formData, "notes", 500),
    adminNote: field(formData, "adminNote", 1000),
  });
  refreshAdmin();
  return { ok: true };
}
