import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Booking } from "./bookingTypes";

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
  // Write-then-rename so a crash mid-write never leaves a truncated file.
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(list, null, 2), "utf8");
  await fs.rename(tmp, FILE);
}

// Serialise read-modify-write cycles so two requests can't overwrite each other.
let queue: Promise<unknown> = Promise.resolve();
function mutate<T>(fn: (list: Booking[]) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const list = await readAll();
    const result = await fn(list);
    await writeAll(list);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

export async function listBookings(): Promise<Booking[]> {
  const list = await readAll();
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addBooking(input: Omit<Booking, "id" | "createdAt" | "status"> & Partial<Pick<Booking, "status">>) {
  return mutate((list) => {
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

export function updateBooking(id: string, patch: Partial<Pick<Booking, "status" | "adminNote">>) {
  return mutate((list) => {
    const booking = list.find((b) => b.id === id);
    if (!booking) return null;
    Object.assign(booking, patch, { updatedAt: new Date().toISOString() });
    return booking;
  });
}

export function deleteBooking(id: string) {
  return mutate((list) => {
    const i = list.findIndex((b) => b.id === id);
    if (i === -1) return false;
    list.splice(i, 1);
    return true;
  });
}
