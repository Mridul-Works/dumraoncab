import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { jsonFile, putUpload } from "./db";
import { getDriverSession, replacedSession, requireDriverSession } from "./driverAuth";
import { findVendorByMobile } from "./vendors";
import { listBookings, getBooking, updateBooking } from "./store";
import { istDate, type Booking, type DriverTrip } from "./bookingTypes";
import type { Vendor, VendorCar, VendorDoc } from "./vendorTypes";

// Server-only helpers for the driver app (/driver, Figma Flow 10).

/* ---------------------------- per-driver app state ---------------------------- */

export type PhotoSide = "front" | "back" | "left" | "right";
export const PHOTO_SIDES: PhotoSide[] = ["front", "back", "left", "right"];
export type CarPhotos = Partial<Record<PhotoSide, string>> & { at?: string };

// Things only the app needs (data/driver-app.json, keyed by vendor id).
export type DriverPrefs = {
  available?: boolean; // Dashboard switch (10.18 / 10.20); default on
  seenApproved?: boolean; // 10.14 shown once
  settingsDone?: boolean; // 10.15 shown once
  carPhotos?: Record<string, CarPhotos>; // handover photos per car (10.10, 10.45)
};

const prefsDb = jsonFile<Record<string, DriverPrefs>>("driver-app.json", () => ({}));

export async function getPrefs(vendorId: string): Promise<DriverPrefs> {
  return (await prefsDb.read())[vendorId] ?? {};
}

export function setPrefs(vendorId: string, fn: (p: DriverPrefs) => void) {
  return prefsDb.mutate((all) => {
    const p = (all[vendorId] ??= {});
    fn(p);
    return p;
  });
}

/* ------------------------------ sign-up drafts ------------------------------ */

// What a new driver fills in before Submit (10.5–10.11), keyed by mobile.
// On Submit it becomes a Vendor with source "driver-app", status "pending".
export type Draft = {
  name: string;
  photo?: VendorDoc;
  carChoice: "own" | "company";
  place: string; // "Ward 7, Naya Bazar, Dumraon"
  upi: string;
  docs: VendorDoc[]; // aadhaar, licence
  cars: VendorCar[];
  carPhotos: Record<string, CarPhotos>;
  agreed?: boolean;
  updatedAt?: string;
};

export const emptyDraft = (): Draft => ({ name: "", carChoice: "own", place: "", upi: "", docs: [], cars: [], carPhotos: {} });

const draftDb = jsonFile<Record<string, Draft>>("driver-drafts.json", () => ({}));

export async function getDraft(mobile: string): Promise<Draft> {
  return { ...emptyDraft(), ...(await draftDb.read())[mobile] };
}

export function updateDraft(mobile: string, fn: (d: Draft) => void) {
  return draftDb.mutate((all) => {
    const d = (all[mobile] = { ...emptyDraft(), ...all[mobile] });
    fn(d);
    d.updatedAt = new Date().toISOString();
    return d;
  });
}

export function deleteDraft(mobile: string) {
  return draftDb.mutate((all) => {
    delete all[mobile];
  });
}

/* --------------------------------- who is it --------------------------------- */

export type DriverContext = { mobile: string; vendor?: Vendor };

export async function getDriver(): Promise<DriverContext | null> {
  const s = await getDriverSession();
  if (!s) {
    // Another phone signed in with this number (Figma 10.55).
    if (await replacedSession()) redirect("/driver/signed-out");
    return null;
  }
  return { mobile: s.mobile, vendor: await findVendorByMobile(s.mobile) };
}

// Pages for a signed-up driver of any status.
export async function requireVendor(): Promise<{ mobile: string; vendor: Vendor }> {
  const s = await requireDriverSession();
  const vendor = await findVendorByMobile(s.mobile);
  if (!vendor) redirect("/driver/join/details");
  return { mobile: s.mobile, vendor };
}

// Pages that need an approved driver (Today, trips, earnings, account).
export async function requireApproved(): Promise<{ mobile: string; vendor: Vendor }> {
  const ctx = await requireVendor();
  if (ctx.vendor.status !== "approved" && ctx.vendor.status !== "suspended") redirect("/driver/status");
  return ctx;
}

/* ------------------------------ trip photos ------------------------------ */

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function sniffImage(b: Buffer): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

// Meter and receipt photos go to the Daily Diary, which shows them from
// /uploads/[file] (data/uploads), same as the admin entry panel.
export async function saveTripPhoto(file: unknown): Promise<{ file: string } | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "Take a photo first." };
  if (file.size > 8 * 1024 * 1024) return { error: "That photo is over 8 MB. Try again." };
  if (!PHOTO_TYPES[file.type]) return { error: "Use a JPG, PNG or WebP photo." };
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = sniffImage(bytes);
  if (!ext) return { error: "That file doesn't look like a photo." };
  const name = `${randomUUID()}.${ext}`;
  await putUpload("uploads", name, bytes);
  return { file: name };
}

/* ---------------------------------- trips ---------------------------------- */

export const OFFER_MINUTES = 10;
export const FREE_WAIT_MINUTES = 30;

// A booking staff assigned to this vendor, from the driver's side.
export const isMine = (b: Booking, vendorId: string) => b.vendorId === vendorId;

// The office sent it and the driver hasn't answered yet (10.18).
export const isOffer = (b: Booking) =>
  b.status !== "cancelled" && b.status !== "completed" && (!b.trip || b.trip.stage === "offered");

// Accepted and not finished yet.
export const isActive = (b: Booking) =>
  b.status !== "cancelled" && !!b.trip && ["accepted", "to-pickup", "waiting", "on-trip", "ended", "paid"].includes(b.trip.stage) && !b.trip.sentAt;

// Started (driver has left), so the trip screens take over.
export const isRunning = (b: Booking) => isActive(b) && b.trip!.stage !== "accepted";

// Cancelled by the office after the driver took it, not yet seen (10.40).
export const isUnseenCancel = (b: Booking) =>
  b.status === "cancelled" && !!b.trip && b.trip.stage !== "declined" && b.trip.stage !== "offered" && !b.trip.sentAt && !b.trip.cancelSeen;

export const offeredAt = (b: Booking) => b.trip?.offeredAt ?? b.updatedAt ?? b.createdAt;

// When the driver has to answer a trip request by (ms), and whether the time
// ran out (10.27: the office gives it to another driver).
export const offerDeadline = (b: Booking) => Date.parse(offeredAt(b)) + OFFER_MINUTES * 60000;
export const isOfferExpired = (b: Booking, now = Date.now()) => isOffer(b) && now >= offerDeadline(b);

// Trips done today (10.24 "Earlier today"): sent to the office, run today.
export const isDoneToday = (b: Booking) => b.status !== "cancelled" && !!b.trip?.sentAt && b.date === istDate();

export async function listMyBookings(vendorId: string): Promise<Booking[]> {
  return (await listBookings()).filter((b) => isMine(b, vendorId));
}

// Read one of this driver's bookings, or null when it isn't theirs.
export async function getMyBooking(id: string, vendorId: string): Promise<Booking | null> {
  const b = await getBooking(id);
  return b && isMine(b, vendorId) ? b : null;
}

// Merge a change into the trip of one of this driver's bookings.
export async function patchTrip(id: string, vendorId: string, fn: (t: DriverTrip, b: Booking) => void): Promise<Booking | null> {
  const b = await getMyBooking(id, vendorId);
  if (!b) return null;
  const trip: DriverTrip = { stage: "offered", offeredAt: offeredAt(b), ...b.trip };
  fn(trip, b);
  return updateBooking(id, { trip });
}

/* ---------------------------------- weeks ---------------------------------- */

// Monday-to-Sunday week (IST) that contains `date` (YYYY-MM-DD).
export function weekOf(date: string = istDate()): { start: string; end: string; payout: string } {
  const d = new Date(`${date}T00:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7;
  const start = new Date(d.getTime() - back * 86400000);
  const day = (n: number) => new Date(start.getTime() + n * 86400000).toISOString().slice(0, 10);
  return { start: day(0), end: day(6), payout: day(7) };
}

/* ---------------------------------- office ---------------------------------- */

// The office line shown across the app ("Call the office on +91 94311 00700").
export async function officeContact(): Promise<{ tel: string; display: string; upi?: string }> {
  const { getCompany } = await import("./company");
  const c = await getCompany();
  const digits = c.phone.replace(/\D/g, "").slice(-10);
  return { tel: `tel:+91${digits}`, display: `+91 ${c.phoneDisplay}`, upi: c.upi };
}

// Route distance from the site's popular routes ("120 km"), when known.
export async function routeDistance(b: Pick<Booking, "from" | "to">): Promise<string | undefined> {
  const { routes } = await import("./site");
  const has = (a: string, b: string) => a.toLowerCase().includes(b.toLowerCase());
  const r = routes.find((x) => (has(b.to, x.to) && has(b.from, x.from)) || (has(b.from, x.to) && has(b.to, x.from)));
  return r?.distance;
}

/* -------------------------------- car status -------------------------------- */

// Odometer and service for one of the driver's cars (Figma 10.51 Profile,
// 10.52 Your car). `km` = the highest meter reading the driver logged for it,
// or the office's estimate if higher. Service comes from the fleet car with
// the same number plate (set by the office in the Daily Diary's one-car view);
// the reading saved there with the service is the "last service".
export type CarStatus = {
  km?: number;
  nextServiceKm?: number;
  nextServiceDate?: string;
  lastServiceKm?: number;
  lastServiceDate?: string;
};

export async function carStatus(car: VendorCar): Promise<CarStatus> {
  const [{ listCars }, { listAllEntries }, { serviceState }] = await Promise.all([import("./fleet"), import("./journal"), import("./catalogTypes")]);
  const plate = (s: string) => s.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const [fleet, entries] = await Promise.all([listCars(), listAllEntries()]);
  const readings = entries.filter((e) => e.carId === car.id).flatMap((e) => [e.odoEnd, e.odoStart]).filter((n): n is number => typeof n === "number" && n > 0);
  let km = readings.length ? Math.max(...readings) : undefined;
  const office = plate(car.number) ? fleet.find((c) => plate(c.number) === plate(car.number)) : undefined;
  if (!office) return { km };
  const est = serviceState(office, entries, istDate()).kmNow;
  if (est != null) km = Math.max(km ?? 0, est);
  return {
    km,
    nextServiceKm: office.nextServiceKm,
    nextServiceDate: office.nextServiceDate,
    lastServiceKm: office.odometerKm,
    lastServiceDate: office.odometerDate,
  };
}
