import { randomUUID } from "crypto";
import { jsonFile } from "./db";
import { counts, meterKm, type DriverEntryInput, type FixReason, type JournalRecord } from "./journalTypes";

// Trip log store (data/journal.json): one entry per trip actually run, with
// what it earned and what it cost. Staff write entries in the admin; drivers
// send theirs from the driver app, and the office checks them (Figma 4B.5–4B.7).

export * from "./journalTypes";

const db = jsonFile<JournalRecord[]>("journal.json", () => []);

// Every entry, including driver entries still waiting for the office.
// Newest day first; within a day, most recently logged first.
export async function listAllEntries(): Promise<JournalRecord[]> {
  const list = await db.read();
  return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

// The entries that count (staff entries + approved driver entries) — what
// totals, the dashboard, fleet and the CSV export use.
export async function listEntries(): Promise<JournalRecord[]> {
  return (await listAllEntries()).filter(counts);
}

export async function getEntry(id: string): Promise<JournalRecord | undefined> {
  return (await db.read()).find((e) => e.id === id);
}

// What the staff entry panel saves.
export type EntryInput = Pick<
  JournalRecord,
  "date" | "carId" | "bookingId" | "customer" | "phone" | "from" | "to" | "roundTrip" | "km" | "fare" | "fuel" | "driverCut" | "note"
>;

export function addEntry(input: EntryInput) {
  return db.mutate((list) => {
    const entry: JournalRecord = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    list.push(entry);
    return entry;
  });
}

// Keeps what the staff form doesn't send (odometer, driver-entry fields …).
export function updateEntry(id: string, input: EntryInput) {
  return db.mutate((list) => {
    const i = list.findIndex((e) => e.id === id);
    if (i === -1) return null;
    list[i] = { ...list[i], ...input, id, createdAt: list[i].createdAt, updatedAt: new Date().toISOString() };
    return list[i];
  });
}

export function deleteEntry(id: string) {
  return db.mutate((list) => {
    const i = list.findIndex((e) => e.id === id);
    if (i === -1) return false;
    list.splice(i, 1);
    return true;
  });
}

// Entries keep their carId when a car is deleted, so history stays intact;
// the UI shows such entries as "Removed car".

/* ------------------------- driver-submitted entries ------------------------- */

function fromDriver(input: DriverEntryInput): Omit<JournalRecord, "id" | "createdAt"> {
  return {
    source: "driver",
    vendorId: input.vendorId,
    carId: input.carId,
    date: input.date,
    bookingId: input.bookingId || undefined,
    customer: input.customer ?? "",
    phone: input.phone || undefined,
    from: input.from,
    to: input.to,
    roundTrip: input.roundTrip || undefined,
    km: input.km ?? meterKm(input),
    routeKm: input.routeKm,
    odoStart: input.odoStart,
    odoEnd: input.odoEnd,
    odoStartPhoto: input.odoStartPhoto,
    odoEndPhoto: input.odoEndPhoto,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    fare: input.fare,
    fuel: input.fuel ?? 0,
    driverCut: input.driverCut ?? 0,
    expenses: input.expenses?.length ? input.expenses : undefined,
    payment: input.payment,
    note: input.note ?? "",
  };
}

// A driver sends a finished trip from the driver app. It arrives as
// "submitted" and only counts in the Trip log once the office approves it.
export function addDriverEntry(input: DriverEntryInput) {
  return db.mutate((list) => {
    const now = new Date().toISOString();
    const entry: JournalRecord = { ...fromDriver(input), id: randomUUID(), createdAt: now, submittedAt: now, status: "submitted" };
    list.push(entry);
    return entry;
  });
}

// The driver sends a fixed entry back after "Ask to fix". Only their own, and
// only while it is not approved. Returns null when not allowed.
export function resubmitDriverEntry(id: string, vendorId: string, input: DriverEntryInput) {
  return db.mutate((list) => {
    const i = list.findIndex((e) => e.id === id);
    const old = list[i];
    if (!old || old.vendorId !== vendorId || old.status === "approved") return null;
    const now = new Date().toISOString();
    list[i] = { ...old, ...fromDriver({ ...input, vendorId }), status: "submitted", submittedAt: now, updatedAt: now };
    return list[i];
  });
}

// One driver's/owner's entries (all statuses), newest first — for the driver app.
export async function listEntriesForVendor(vendorId: string): Promise<JournalRecord[]> {
  return (await listAllEntries()).filter((e) => e.vendorId === vendorId);
}

// Office: approve, with the money as checked (Fare / Fuel / Driver share).
export function approveEntry(id: string, money: { fare: number; fuel: number; driverCut: number }) {
  return db.mutate((list) => {
    const e = list.find((x) => x.id === id);
    if (!e || e.source !== "driver") return null;
    const now = new Date().toISOString();
    Object.assign(e, money, { status: "approved", fixReason: undefined, fixNote: undefined, reviewedAt: now, updatedAt: now });
    return e;
  });
}

// Office: send the entry back to the driver with a note. It stays on hold.
export function askToFix(id: string, reason: FixReason, note: string) {
  return db.mutate((list) => {
    const e = list.find((x) => x.id === id);
    if (!e || e.source !== "driver") return null;
    const now = new Date().toISOString();
    Object.assign(e, { status: "fix", fixReason: reason, fixNote: note, reviewedAt: now, updatedAt: now });
    return e;
  });
}

// Undo an approval (toast "Undo"): back to waiting for a check.
export function unapproveEntry(id: string) {
  return db.mutate((list) => {
    const e = list.find((x) => x.id === id);
    if (!e || e.status !== "approved") return null;
    e.status = "submitted";
    e.reviewedAt = undefined;
    e.updatedAt = new Date().toISOString();
    return e;
  });
}
