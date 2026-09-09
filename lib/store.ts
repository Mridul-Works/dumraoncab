import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Booking, BookingStatus } from "./bookingTypes";

// Simple JSON-file booking store. Works on any Node host (VPS, PM2, Docker).
// NOTE: on serverless platforms (Vercel/Netlify) the filesystem is ephemeral —
// swap these helpers for a database before deploying there (see README).

export type { Booking, BookingStatus } from "./bookingTypes";

const FILE = path.join(process.cwd(), "data", "bookings.json");

async function readAll(): Promise<Booking[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Booking[];
  } catch {
    return [];
  }
}

async function writeAll(list: Booking[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(list, null, 2), "utf8");
}

export async function listBookings(): Promise<Booking[]> {
  const list = await readAll();
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addBooking(
  input: Omit<Booking, "id" | "createdAt" | "status">,
): Promise<Booking> {
  const list = await readAll();
  const booking: Booking = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: "new",
  };
  list.push(booking);
  await writeAll(list);
  return booking;
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<Booking | null> {
  const list = await readAll();
  const booking = list.find((b) => b.id === id);
  if (!booking) return null;
  booking.status = status;
  await writeAll(list);
  return booking;
}
