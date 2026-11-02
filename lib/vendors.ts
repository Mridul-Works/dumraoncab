import { randomUUID } from "crypto";
import { jsonFile } from "./db";
import type { Vendor } from "./vendorTypes";

// Vendor store (data/vendors.json — gitignored). Shared by the admin Vendors
// section and the driver app.

export * from "./vendorTypes";

const db = jsonFile<Vendor[]>("vendors.json", () => []);

// Indian date "YYYY-MM-DD" (the business runs on IST).
const istToday = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

// A suspension "for 7 / 30 days" ends by itself: past its end date the vendor
// reads as approved again (the file is fixed up on the next write).
function live(v: Vendor): Vendor {
  if (v.status === "suspended" && v.suspendedUntil && v.suspendedUntil < istToday()) {
    return { ...v, status: "approved", suspendedUntil: undefined, statusReason: undefined, statusMessage: undefined };
  }
  return v;
}

export async function listVendors(): Promise<Vendor[]> {
  const list = (await db.read()).map(live);
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Approved vendors only — the pool for "Assign car and driver" on a booking.
export async function listApprovedVendors(): Promise<Vendor[]> {
  return (await listVendors()).filter((v) => v.status === "approved");
}

export async function getVendor(id: string): Promise<Vendor | undefined> {
  const v = (await db.read()).find((x) => x.id === id);
  return v && live(v);
}

const digits = (m: string) => m.replace(/\D/g, "").slice(-10);

export async function findVendorByMobile(mobile: string): Promise<Vendor | undefined> {
  const d = digits(mobile);
  return d.length === 10 ? (await db.read()).find((v) => digits(v.mobile) === d) : undefined;
}

export function addVendor(input: Omit<Vendor, "id" | "createdAt">) {
  return db.mutate((list) => {
    // Running "VN-0001" style code, shown on the admin "Vendor added" screen.
    const last = list.reduce((n, v) => Math.max(n, Number(v.code?.replace(/\D/g, "")) || 0), 0);
    const code = input.code || `VN-${String(Math.max(last, list.length) + 1).padStart(4, "0")}`;
    const vendor: Vendor = { ...input, code, id: randomUUID(), createdAt: new Date().toISOString() };
    list.push(vendor);
    return vendor;
  });
}

// `fn` edits the vendor in place; returns the updated vendor or null.
export function updateVendor(id: string, fn: (v: Vendor) => void) {
  return db.mutate((list) => {
    const v = list.find((x) => x.id === id);
    if (!v) return null;
    Object.assign(v, live(v));
    fn(v);
    v.updatedAt = new Date().toISOString();
    return v;
  });
}

export function deleteVendor(id: string) {
  return db.mutate((list) => {
    const i = list.findIndex((v) => v.id === id);
    if (i === -1) return false;
    list.splice(i, 1);
    return true;
  });
}
