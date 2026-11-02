"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";
import { istDate } from "@/lib/bookingTypes";
import { listBookings, updateBooking } from "@/lib/store";
import { saveVendorDoc, VENDOR_DOC_NAME, type SavedVendorDoc } from "@/lib/vendorDocs";
import {
  CAR_DOCS,
  DOC_LABELS,
  PERSON_DOCS,
  REQUIRED_PERSON_DOCS,
  addVendor,
  carReady,
  findDoc,
  findVendorByMobile,
  getVendor,
  listVendors,
  updateVendor,
  type Vendor,
  type VendorCar,
  type VendorDoc,
  type VendorKind,
  type WorkPlace,
} from "@/lib/vendors";
import { refreshAdmin } from "./form";

// Server Actions for the admin Vendors section (Figma Flow 6). Every action
// checks the staff session first; vendor documents live in data/vendor-docs.

const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const digits10 = (m: string) => m.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const fmtMobile = (d: string) => `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
const event = (text: string, by: "staff" | "vendor" = "staff") => ({ at: new Date().toISOString(), text, by });

// ---- Uploads -----------------------------------------------------------------

// Upload from the Add / Edit vendor form. The returned record goes back with the form.
export async function uploadVendorFile(formData: FormData): Promise<SavedVendorDoc | { error: string }> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a file first." };
  return saveVendorDoc(file);
}

type DocRef = { carId?: string; kind: VendorDoc["kind"] };

function docList(v: Vendor, ref: DocRef): VendorDoc[] | null {
  if (!ref.carId) return PERSON_DOCS.includes(ref.kind as never) ? v.docs : null;
  const car = v.cars.find((c) => c.id === ref.carId);
  return car && CAR_DOCS.includes(ref.kind as never) ? car.docs : null;
}

function docAt(v: Vendor, ref: DocRef): VendorDoc | null {
  const list = docList(v, ref);
  if (!list) return null;
  let d = findDoc(list, ref.kind);
  if (!d) {
    d = { kind: ref.kind, status: "missing" };
    list.push(d);
  }
  return d;
}

// "Upload" on a Missing document row of the vendor page.
export async function uploadDocFor(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const id = clean(formData.get("id"), 64);
  const carId = clean(formData.get("carId"), 64) || undefined;
  const kind = clean(formData.get("kind"), 20) as VendorDoc["kind"];
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a file first." };
  const saved = await saveVendorDoc(file);
  if ("error" in saved) return saved;
  const done = await updateVendor(id, (v) => {
    const d = docAt(v, { carId, kind });
    if (!d) return;
    Object.assign(d, { ...saved, status: "review", reason: undefined, askedAt: undefined, fileBack: undefined, fileBackName: undefined });
    (v.history ??= []).push(event(`${DOC_LABELS[kind]} uploaded by staff`));
  });
  if (!done) return { error: "This vendor was deleted." };
  refreshAdmin();
  return {};
}

// ---- Document review (Figma 6.6 / 6.17) ----------------------------------------

export async function reviewDoc(
  id: string,
  ref: DocRef,
  input: { action: "verify" | "reupload" | "save"; reason?: string; note?: string; number?: string; validTill?: string },
): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const done = await updateVendor(id, (v) => {
    const d = docAt(v, ref);
    if (!d) return;
    d.staffNote = clean(input.note, 600) || undefined;
    if (input.number !== undefined) {
      // Aadhaar: only the last 4 digits are ever stored.
      const n = clean(input.number, 40);
      d.number = (d.kind === "aadhaar" ? n.replace(/\D/g, "").slice(-4) : n.toUpperCase()) || undefined;
    }
    if (input.validTill !== undefined) d.validTill = isDate(input.validTill) ? input.validTill : undefined;
    if (input.action === "verify" && d.file) {
      d.status = "verified";
      d.reviewedAt = new Date().toISOString();
      (v.history ??= []).push(event(`${DOC_LABELS[d.kind]} verified by ${session.email}`));
    } else if (input.action === "reupload") {
      d.status = "reupload";
      d.reason = clean(input.reason, 120) || undefined;
      d.askedAt = new Date().toISOString();
      (v.history ??= []).push(event(`Asked to re-upload ${DOC_LABELS[d.kind]}${d.reason ? ` · ${d.reason}` : ""}`));
    }
  });
  if (!done) return { error: "This vendor was deleted." };
  refreshAdmin();
  return {};
}

// ---- Status changes (Figma 6.7–6.11, 6.16) ---------------------------------------

function remember(v: Vendor) {
  v.lastChange = {
    status: v.status,
    statusReason: v.statusReason,
    statusMessage: v.statusMessage,
    statusAt: v.statusAt,
    statusBy: v.statusBy,
    suspendedUntil: v.suspendedUntil,
  };
}

export async function approveVendor(id: string): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const vendor = await getVendor(id);
  if (!vendor) return { error: "This vendor was deleted." };
  const missing = REQUIRED_PERSON_DOCS.filter((k) => {
    const d = findDoc(vendor.docs, k);
    return !d?.file || d.status === "missing" || d.status === "reupload";
  });
  if (missing.length) return { error: `Upload the ${missing.map((k) => DOC_LABELS[k].toLowerCase()).join(" and ")} first.` };
  await updateVendor(id, (v) => {
    remember(v);
    v.status = "approved";
    v.statusAt = new Date().toISOString();
    v.statusBy = session.email;
    v.statusReason = undefined;
    v.statusMessage = undefined;
    v.suspendedUntil = undefined;
    v.approvedAt ??= v.statusAt;
    (v.history ??= []).push(event(`Approved by ${session.email}`));
  });
  refreshAdmin();
  return {};
}

export async function rejectVendor(id: string, reason: string, message: string): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const label = clean(reason, 80);
  if (!label) return { error: "Pick a reason." };
  const done = await updateVendor(id, (v) => {
    remember(v);
    v.status = "rejected";
    v.statusAt = new Date().toISOString();
    v.statusBy = session.email;
    v.statusReason = label;
    v.statusMessage = clean(message, 600) || undefined;
    v.suspendedUntil = undefined;
    (v.history ??= []).push(event(`Rejected by ${session.email} · ${label}`));
  });
  if (!done) return { error: "This vendor was deleted." };
  refreshAdmin();
  return {};
}

const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

function km(a?: { lat?: number; lng?: number }, b?: { lat?: number; lng?: number }) {
  if (a?.lat == null || a.lng == null || b?.lat == null || b.lng == null) return Infinity;
  const r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371;
}

// Bookings still to run that use this vendor's cars.
async function upcomingFor(vendorId: string) {
  const today = istDate();
  return (await listBookings()).filter(
    (b) => b.vendorId === vendorId && b.status !== "completed" && b.status !== "cancelled" && (!b.date || b.date >= today),
  );
}

export async function suspendVendor(
  id: string,
  input: { reason: string; days: 7 | 30 | null; message: string; move: boolean },
): Promise<{ error?: string; moved?: number }> {
  const session = await requireAdmin();
  const reason = clean(input.reason, 80);
  if (!reason) return { error: "Pick a reason." };
  const vendor = await getVendor(id);
  if (!vendor) return { error: "This vendor was deleted." };
  const today = istDate();
  const until = input.days === 7 || input.days === 30 ? addDays(today, input.days) : null;

  // Move upcoming bookings to the nearest approved vendor with a ready car of the same type.
  const moved: NonNullable<Vendor["lastChange"]>["moved"] = [];
  const movedTo = new Set<string>();
  if (input.move) {
    const others = (await listVendors()).filter((v) => v.id !== id && v.status === "approved");
    for (const b of await upcomingFor(id)) {
      const type = vendor.cars.find((c) => c.id === b.vendorCarId)?.type;
      const options = others
        .flatMap((v) => v.cars.filter((c) => carReady(c, today) && (!type || c.type === type)).map((c) => ({ v, c })))
        .sort((p, q) => km(vendor.address, p.v.address) - km(vendor.address, q.v.address));
      const pick = options[0];
      moved.push({ bookingId: b.id, vendorId: b.vendorId, vendorCarId: b.vendorCarId, driverName: b.driverName, driverMobile: b.driverMobile });
      await updateBooking(
        b.id,
        pick
          ? { vendorId: pick.v.id, vendorCarId: pick.c.id, driverName: pick.v.name, driverMobile: pick.v.mobile }
          : { vendorId: undefined, vendorCarId: undefined, driverName: undefined, driverMobile: undefined },
      );
      movedTo.add(pick ? pick.v.name : "");
    }
  }

  await updateVendor(id, (v) => {
    remember(v);
    v.lastChange!.moved = moved;
    v.status = "suspended";
    v.statusAt = new Date().toISOString();
    v.statusBy = session.email;
    v.statusReason = reason;
    v.statusMessage = clean(input.message, 600) || undefined;
    v.suspendedUntil = until;
    const names = [...movedTo].filter(Boolean);
    const refs = moved.map((m) => `DC-${m.bookingId.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase()}`);
    const movedText = moved.length
      ? ` Bookings ${refs.join(" and ")} ${names.length ? `moved to ${names.join(" and ")}` : "need a new driver"}.`
      : "";
    (v.history ??= []).push(event(`Suspended by ${session.email} · ${reason}.${movedText}`));
  });
  refreshAdmin();
  return { moved: moved.length };
}

export async function reactivateVendor(id: string): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const done = await updateVendor(id, (v) => {
    remember(v);
    v.status = "approved";
    v.statusAt = new Date().toISOString();
    v.statusBy = session.email;
    v.statusReason = undefined;
    v.statusMessage = undefined;
    v.suspendedUntil = undefined;
    (v.history ??= []).push(event(`Reactivated by ${session.email}`));
  });
  if (!done) return { error: "This vendor was deleted." };
  refreshAdmin();
  return {};
}

// "Undo" on the approve / reject / suspend / reactivate toast.
export async function undoVendorChange(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const vendor = await getVendor(id);
  const prev = vendor?.lastChange;
  if (!vendor || !prev) return { error: "Nothing to undo." };
  for (const m of prev.moved ?? []) {
    await updateBooking(m.bookingId, { vendorId: m.vendorId, vendorCarId: m.vendorCarId, driverName: m.driverName, driverMobile: m.driverMobile });
  }
  await updateVendor(id, (v) => {
    if (v.status === "approved" && prev.status === "pending" && v.approvedAt === v.statusAt) v.approvedAt = undefined;
    Object.assign(v, {
      status: prev.status,
      statusReason: prev.statusReason,
      statusMessage: prev.statusMessage,
      statusAt: prev.statusAt,
      statusBy: prev.statusBy,
      suspendedUntil: prev.suspendedUntil,
      lastChange: undefined,
    });
    (v.history ??= []).push(event("Last change undone"));
  });
  refreshAdmin();
  return {};
}

// ---- Add / edit vendor (Figma 6.3–6.5, 6.18) ---------------------------------------

export type VendorFormDoc = { kind: VendorDoc["kind"]; file?: string; fileName?: string; sizeKb?: number; fileBack?: string; fileBackName?: string; validTill?: string };

export type VendorFormInput = {
  id?: string;
  kind: VendorKind;
  name: string;
  mobile: string;
  altMobile: string;
  email: string;
  address: { line: string; town: string; district: string; state: string; pin: string; lat?: number; lng?: number };
  radiusKm: number | null;
  places: WorkPlace[];
  docs: VendorFormDoc[];
  cars: { id: string; model: string; number: string; type: string; fuel: string; seats: string; year: string; docs: VendorFormDoc[] }[];
  upi: string;
  pan: string;
  next?: "another";
  welcomed?: boolean; // the form opened the "you are registered" WhatsApp
};

export type VendorFormErrors = Record<string, string>;

// Shared with the form so client and server agree on what blocks a save.
function check(input: VendorFormInput): VendorFormErrors {
  const e: VendorFormErrors = {};
  if (!clean(input.name)) e.name = "Enter their full name";
  const m = digits10(input.mobile ?? "");
  if (!m) e.mobile = "Enter their mobile number";
  else if (m.length !== 10) e.mobile = "Enter all 10 digits";
  const alt = digits10(input.altMobile ?? "");
  if (alt && alt.length !== 10) e.altMobile = "Enter all 10 digits";
  if (clean(input.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(input.email))) e.email = "Check the email address";
  if (!input.docs?.find((d) => d.kind === "aadhaar")?.file) e.aadhaar = "Needed before approval";
  if (!clean(input.upi)) e.upi = "Add a UPI ID so we can pay them";
  else if (!/^[\w.-]{2,}@[a-z][a-z0-9]{1,}$/i.test(clean(input.upi))) e.upi = "A UPI ID looks like name@bank";
  if (input.address?.pin && !/^\d{6}$/.test(input.address.pin)) e.pin = "PIN codes have 6 digits";
  if (input.kind === "owner" && !(input.cars ?? []).length) e.cars = "Add the car they will run";
  (input.cars ?? []).forEach((c, i) => {
    if (!clean(c.model)) e[`car${i}.model`] = "Choose the car model";
    if (!clean(c.number)) e[`car${i}.number`] = "Enter the car number";
  });
  return e;
}

const validFile = (f?: string) => (f && VENDOR_DOC_NAME.test(f) ? f : undefined);

// Merge the form's documents into the stored list: new files go to "Needs review",
// unchanged files keep their review state.
function mergeDocs(kinds: VendorDoc["kind"][], incoming: VendorFormDoc[], existing: VendorDoc[] = []): VendorDoc[] {
  return kinds.map((kind) => {
    const old = findDoc(existing, kind);
    const inc = incoming.find((d) => d.kind === kind);
    const file = validFile(inc?.file);
    const validTill = isDate(inc?.validTill) ? inc!.validTill : old?.validTill;
    if (!file) return old?.file ? { ...old, status: old.status, validTill } : { ...(old ?? {}), kind, status: old?.status === "reupload" ? "reupload" : "missing", validTill };
    if (old?.file === file) return { ...old, validTill, fileBack: validFile(inc?.fileBack) ?? old.fileBack, fileBackName: inc?.fileBackName ?? old.fileBackName };
    return {
      ...(old ?? {}),
      kind,
      status: "review",
      file,
      fileName: clean(inc?.fileName, 120) || undefined,
      sizeKb: Number(inc?.sizeKb) || undefined,
      fileBack: validFile(inc?.fileBack),
      fileBackName: clean(inc?.fileBackName, 120) || undefined,
      uploadedAt: new Date().toISOString(),
      validTill,
      reason: undefined,
      askedAt: undefined,
    };
  });
}

export async function saveVendor(input: VendorFormInput): Promise<{ errors?: VendorFormErrors; error?: string }> {
  await requireAdmin();
  const errors = check(input);
  const mobile = digits10(input.mobile ?? "");
  if (!errors.mobile) {
    const clash = await findVendorByMobile(mobile);
    if (clash && clash.id !== input.id) errors.mobile = `${clash.name} already uses this number`;
  }
  if (Object.keys(errors).length) return { errors };

  const existing = input.id ? await getVendor(input.id) : undefined;
  if (input.id && !existing) return { error: "This vendor was deleted." };

  const alt = digits10(input.altMobile ?? "");
  const a = input.address ?? { line: "", town: "", district: "", state: "", pin: "" };
  const lat = Number(a.lat);
  const lng = Number(a.lng);
  const pinned = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0);
  const fields = {
    kind: (input.kind === "driver" ? "driver" : "owner") as VendorKind,
    name: clean(input.name, 80),
    mobile: fmtMobile(mobile),
    altMobile: alt ? fmtMobile(alt) : undefined,
    email: clean(input.email, 120) || undefined,
    address: {
      line: clean(a.line, 160),
      town: clean(a.town, 60),
      district: clean(a.district, 60),
      state: clean(a.state, 60),
      pin: clean(a.pin, 6),
      ...(pinned ? { lat: Math.round(lat * 1e4) / 1e4, lng: Math.round(lng * 1e4) / 1e4 } : {}),
    },
    radiusKm: input.radiusKm === null ? null : [10, 25, 50].includes(Number(input.radiusKm)) ? Number(input.radiusKm) : 50,
    places: (input.places ?? [])
      .slice(0, 20)
      .map((p) => ({ name: clean(p.name, 60), km: Number.isFinite(Number(p.km)) ? Math.round(Number(p.km)) : undefined, home: !!p.home || undefined, onRequest: !!p.onRequest || undefined }))
      .filter((p) => p.name),
    upi: clean(input.upi, 80),
    pan: clean(input.pan, 10).toUpperCase() || undefined,
  };
  const docs = mergeDocs(PERSON_DOCS, input.docs ?? [], existing?.docs);
  const cars: VendorCar[] = (input.cars ?? []).slice(0, 10).map((c) => {
    const old = existing?.cars.find((x) => x.id === c.id);
    return {
      id: old?.id ?? randomUUID(),
      model: clean(c.model, 60),
      number: clean(c.number, 16).toUpperCase(),
      type: clean(c.type, 20),
      fuel: clean(c.fuel, 20),
      seats: Math.min(Math.max(Number(c.seats) || 0, 0), 30),
      year: Math.min(Math.max(Number(c.year) || 0, 0), 2100),
      docs: mergeDocs(CAR_DOCS, c.docs ?? [], old?.docs),
    };
  });

  let id = input.id;
  if (existing) {
    await updateVendor(existing.id, (v) => {
      Object.assign(v, fields, { docs, cars });
      (v.history ??= []).push(event("Details edited by staff"));
    });
  } else {
    const vendor = await addVendor({
      ...fields,
      source: "admin",
      status: "pending",
      docs,
      cars,
      history: [event("Added by staff"), ...(input.welcomed ? [event("Welcome note opened on WhatsApp")] : [])],
    });
    id = vendor.id;
  }
  refreshAdmin();
  if (existing) redirect(`/admin/vendors/${id}?saved=1`);
  if (input.next === "another") redirect(`/admin/vendors/new?added=${encodeURIComponent(fields.name)}`);
  redirect(`/admin/vendors/${id}/added`);
}
