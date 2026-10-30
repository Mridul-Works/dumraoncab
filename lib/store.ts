import { randomUUID } from "crypto";
import { jsonFile } from "./db";
import type { Booking, BookingPatch } from "./bookingTypes";

// Booking store (data/bookings.json — gitignored).

export type { Booking, BookingStatus } from "./bookingTypes";

const db = jsonFile<Booking[]>("bookings.json", () => []);

export async function listBookings(): Promise<Booking[]> {
  const list = await db.read();
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getBooking(id: string): Promise<Booking | undefined> {
  return (await db.read()).find((b) => b.id === id);
}

export function addBooking(input: Omit<Booking, "id" | "createdAt" | "status"> & Partial<Pick<Booking, "status">>) {
  return db.mutate((list) => {
    const booking: Booking = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: input.status ?? "new",
    };
    list.push(booking);
    return booking;
  });
}

export function updateBooking(id: string, patch: BookingPatch) {
  return db.mutate((list) => {
    const booking = list.find((b) => b.id === id);
    if (!booking) return null;
    for (const [key, value] of Object.entries(patch)) {
      // `undefined` clears an optional field (e.g. removing a quote).
      if (value === undefined) delete (booking as Record<string, unknown>)[key];
      else (booking as Record<string, unknown>)[key] = value;
    }
    booking.updatedAt = new Date().toISOString();
    return booking;
  });
}

export function deleteBooking(id: string) {
  return db.mutate((list) => {
    const i = list.findIndex((b) => b.id === id);
    if (i === -1) return false;
    list.splice(i, 1);
    return true;
  });
}
