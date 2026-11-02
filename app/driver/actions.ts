"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh, revalidatePath } from "next/cache";
import {
  DEMO_MOBILE,
  endDriverSession,
  isDemoShortcut,
  mobileDigits,
  requireDriverSession,
  sendCode,
  showMobile,
  startDriverSession,
  verifyCode,
} from "@/lib/driverAuth";
import {
  deleteDraft,
  getDraft,
  getMyBooking,
  getPrefs,
  isOffer,
  listMyBookings,
  patchTrip,
  PHOTO_SIDES,
  requireApproved,
  requireVendor,
  saveTripPhoto,
  setPrefs,
  updateDraft,
  type PhotoSide,
} from "@/lib/driverTrips";
import { addVendor, findVendorByMobile, updateVendor } from "@/lib/vendors";
import { CAR_DOCS, DOC_LABELS, PERSON_DOCS, type VendorCar, type VendorDoc } from "@/lib/vendorTypes";
import { saveVendorDoc } from "@/lib/vendorDocs";
import { addDriverEntry, getEntry, resubmitDriverEntry, type DriverEntryInput } from "@/lib/journal";
import { getCompany } from "@/lib/company";
import { istDate, phoneDigits, type Booking } from "@/lib/bookingTypes";
import { declineReasons, EXPENSE_KINDS, lastOdometer, meterProblem } from "@/components/driver/rules";

// Server Actions for the driver app (/driver, Figma Flow 10). Every action
// re-checks the signed driver session and only touches the driver's own data.

export type ActionState = { error?: string; ok?: boolean; triesLeft?: number; devCode?: string; resendIn?: number } | undefined;

const PENDING = "dc_driver_m"; // mobile waiting for its code
const DEV_CODE = "dc_driver_dev"; // development only: code shown on 10.3

const str = (fd: FormData, key: string, max = 200) => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
};
const int = (fd: FormData, key: string) => {
  const n = Number(str(fd, key, 20).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) && str(fd, key) !== "" ? Math.max(0, Math.round(n)) : NaN;
};
const fileOf = (fd: FormData, key = "file") => {
  const f = fd.get(key);
  return f instanceof File && f.size > 0 ? f : null;
};

function touched() {
  revalidatePath("/driver", "layout");
  revalidatePath("/admin", "layout");
}

/* --------------------------------- sign in --------------------------------- */

const shortCookie = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/driver", maxAge: 15 * 60 };

export async function requestCode(_prev: ActionState, fd: FormData): Promise<ActionState> {
  // Demo shortcut (lib/driverAuth.ts): 111 → straight in as the demo driver.
  if (isDemoShortcut(str(fd, "mobile", 20))) {
    await startDriverSession(DEMO_MOBILE);
    redirect("/driver");
  }
  const mobile = mobileDigits(str(fd, "mobile", 20));
  if (!mobile) return { error: "Enter your 10-digit mobile number." };
  const res = await sendCode(mobile).catch((err: Error) => {
    console.error("[driver-app] sign-in failed:", err);
    return { ok: false as const, error: "Sign-in isn’t working right now. Please call the office." };
  });
  if (!res.ok) return { error: res.error };
  const jar = await cookies();
  jar.set(PENDING, mobile, shortCookie);
  if (res.devCode) jar.set(DEV_CODE, res.devCode, shortCookie);
  else jar.delete(DEV_CODE);
  redirect("/driver/code");
}

export async function resendCode(): Promise<ActionState> {
  const jar = await cookies();
  const mobile = mobileDigits(jar.get(PENDING)?.value ?? "");
  if (!mobile) redirect("/driver/sign-in");
  const res = await sendCode(mobile).catch((err: Error) => {
    console.error("[driver-app] resend failed:", err);
    return { ok: false as const, error: "Sign-in isn’t working right now. Please call the office.", resendIn: undefined };
  });
  if (!res.ok) return { error: res.error, resendIn: res.resendIn };
  if (res.devCode) jar.set(DEV_CODE, res.devCode, shortCookie);
  return { ok: true, resendIn: res.resendIn, devCode: res.devCode };
}

export async function confirmCode(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const jar = await cookies();
  const mobile = mobileDigits(jar.get(PENDING)?.value ?? "");
  if (!mobile) redirect("/driver/sign-in");
  const res = await verifyCode(mobile, str(fd, "code", 6));
  if (!res.ok) return { error: res.error, triesLeft: res.triesLeft };
  jar.delete(PENDING);
  jar.delete(DEV_CODE);
  await startDriverSession(mobile);
  redirect("/driver");
}

export async function signOut() {
  await endDriverSession();
  redirect("/driver/welcome");
}

/* ------------------------------- join (sign-up) ------------------------------- */

// Sign-up screens are for numbers that aren't a vendor yet.
async function requireNewDriver(): Promise<string> {
  const { mobile } = await requireDriverSession();
  if (await findVendorByMobile(mobile)) redirect("/driver");
  return mobile;
}

export async function saveDetails(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const mobile = await requireNewDriver();
  const name = str(fd, "name", 80);
  const place = str(fd, "place", 160);
  const upi = str(fd, "upi", 60);
  const carChoice = str(fd, "car") === "company" ? "company" : "own";
  if (name.length < 3) return { error: "Write your full name, as on your licence." };
  if (!place) return { error: "Write where you live." };
  if (!/^[\w.\-]{2,}@[a-z]{2,}$/i.test(upi)) return { error: "Write your UPI ID, like name@ybl." };
  await updateDraft(mobile, (d) => Object.assign(d, { name, place, upi, carChoice }));
  redirect("/driver/join/documents");
}

const DOC_KINDS: VendorDoc["kind"][] = [...PERSON_DOCS, ...CAR_DOCS];

// Upload one document photo: during sign-up it goes to the draft; for a signed-up
// driver it replaces the stored one and waits for the office to check it.
export async function uploadDoc(fd: FormData): Promise<ActionState> {
  const { mobile } = await requireDriverSession();
  const kind = str(fd, "kind") as VendorDoc["kind"];
  const carId = str(fd, "car", 60);
  const file = fileOf(fd);
  if (!DOC_KINDS.includes(kind)) return { error: "Unknown document." };
  if (!file) return { error: "Take a photo first." };
  const saved = await saveVendorDoc(file);
  if ("error" in saved) return { error: saved.error };
  const doc: VendorDoc = { kind, status: "review", file: saved.file, fileName: saved.fileName, sizeKb: saved.sizeKb, uploadedAt: saved.uploadedAt };

  const put = (list: VendorDoc[]) => {
    const i = list.findIndex((d) => d.kind === kind);
    const prev = i >= 0 ? list[i] : undefined;
    // Keep what the office typed (number, note); the new photo needs checking again.
    // The old expiry stays until the office types the new one, so trips stay
    // paused (10.47) until the new paper is checked.
    const next: VendorDoc = { ...prev, ...doc, reason: undefined };
    if (kind === "photo") next.status = "verified";
    if (i >= 0) list[i] = next;
    else list.push(next);
  };

  const vendor = await findVendorByMobile(mobile);
  if (vendor) {
    const ok = await updateVendor(vendor.id, (v) => {
      if (carId) {
        const car = v.cars.find((c) => c.id === carId);
        if (car) put(car.docs);
      } else put(v.docs);
      v.history = [...(v.history ?? []), { at: new Date().toISOString(), text: `Uploaded ${DOC_LABELS[kind]} in the driver app`, by: "vendor" }];
    });
    if (!ok) return { error: "Could not save. Try again." };
  } else {
    await updateDraft(mobile, (d) => {
      if (kind === "photo") d.photo = { ...doc, status: "verified" };
      else if (carId) {
        const car = d.cars.find((c) => c.id === carId);
        if (car) put(car.docs);
      } else put(d.docs);
    });
  }
  touched();
  refresh();
  return { ok: true };
}

const CAR_TYPES = ["SUV", "MUV", "Sedan", "Hatchback", "Tempo Traveller", "Bus"];
const FUELS = ["Diesel", "Petrol", "CNG", "EV"];

export async function setCarCount(count: number) {
  const mobile = await requireNewDriver();
  const n = Math.max(1, Math.min(10, Math.round(count)));
  let added: string | undefined;
  await updateDraft(mobile, (d) => {
    while (d.cars.length < n) {
      added = randomUUID();
      d.cars.push({ id: added, model: "", number: "", type: "SUV", fuel: "Diesel", seats: 7, year: new Date().getFullYear(), docs: [] });
    }
    // Only cars with nothing filled in are removed.
    while (d.cars.length > n && !d.cars[d.cars.length - 1].model && !d.cars[d.cars.length - 1].docs.length) d.cars.pop();
  });
  if (added) redirect(`/driver/join/cars/${added}`);
  refresh();
}

export async function saveCar(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const mobile = await requireNewDriver();
  const id = str(fd, "id", 60);
  const model = str(fd, "model", 60);
  const number = str(fd, "number", 20).toUpperCase().replace(/\s+/g, " ");
  const type = CAR_TYPES.includes(str(fd, "type")) ? str(fd, "type") : "SUV";
  const fuel = FUELS.includes(str(fd, "fuel")) ? str(fd, "fuel") : "Diesel";
  const seats = int(fd, "seats");
  const year = int(fd, "year");
  if (!model) return { error: "Write the car model, like Maruti Ertiga." };
  if (!/^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,3}\s?\d{3,4}$/.test(number)) return { error: "Write the number plate, like BR 44 CD 5678." };
  if (!(seats >= 2 && seats <= 30)) return { error: "Write the number of seats." };
  if (!(year >= 1995 && year <= new Date().getFullYear() + 1)) return { error: "Write the year the car was made." };
  const done = await updateDraft(mobile, (d) => {
    const car = d.cars.find((c) => c.id === id);
    if (car) Object.assign(car, { model, number, type, fuel, seats, year });
  });
  if (!done.cars.some((c) => c.id === id)) return { error: "That car was removed. Go back to Your cars." };
  refresh();
  return { ok: true };
}

export async function uploadCarPhoto(fd: FormData): Promise<ActionState> {
  const { mobile } = await requireDriverSession();
  const carId = str(fd, "car", 60);
  const side = str(fd, "side") as PhotoSide;
  const file = fileOf(fd);
  if (!PHOTO_SIDES.includes(side) || !file) return { error: "Take a photo first." };
  const saved = await saveVendorDoc(file);
  if ("error" in saved) return { error: saved.error };
  const vendor = await findVendorByMobile(mobile);
  if (vendor) {
    if (!vendor.cars.some((c) => c.id === carId)) return { error: "Unknown car." };
    await setPrefs(vendor.id, (p) => {
      const all = (p.carPhotos ??= {});
      all[carId] = { ...all[carId], [side]: saved.file, at: saved.uploadedAt };
    });
  } else {
    await updateDraft(mobile, (d) => {
      d.carPhotos[carId] = { ...d.carPhotos[carId], [side]: saved.file, at: saved.uploadedAt };
    });
  }
  refresh();
  return { ok: true };
}

export async function submitForChecking(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const mobile = await requireNewDriver();
  if (fd.get("agree") !== "on") return { error: "Tick the box to confirm these are your documents." };
  const d = await getDraft(mobile);
  if (!d.name || !d.upi) redirect("/driver/join/details");
  const missing = (["aadhaar", "licence"] as const).filter((k) => !d.docs.some((x) => x.kind === k && x.file));
  if (missing.length) return { error: `Add your ${missing.map((k) => (k === "aadhaar" ? "Aadhaar card" : "driving licence")).join(" and ")} first.` };
  const cars: VendorCar[] = d.carChoice === "own" ? d.cars.filter((c) => c.model && c.number) : [];
  if (d.carChoice === "own" && !cars.length) return { error: "Add your car first." };

  const now = new Date().toISOString();
  const vendor = await addVendor({
    source: "driver-app",
    kind: d.carChoice === "own" ? "owner" : "driver",
    status: "pending",
    name: d.name,
    mobile: showMobile(mobile),
    whatsapp: true,
    address: { line: d.place, town: "", district: "", state: "Bihar", pin: "" },
    places: [],
    docs: [...(d.photo ? [d.photo] : []), ...d.docs],
    cars,
    upi: d.upi,
    history: [{ at: now, text: "Signed up in the driver app and sent for checking", by: "vendor" }],
  });
  const photos = Object.fromEntries(Object.entries(d.carPhotos).filter(([id]) => cars.some((c) => c.id === id)));
  if (Object.keys(photos).length) await setPrefs(vendor.id, (p) => void (p.carPhotos = photos));
  await deleteDraft(mobile);
  touched();
  redirect("/driver/status");
}

/* ------------------------------ after approval ------------------------------ */

export async function seenApproved() {
  const { vendor } = await requireVendor();
  await setPrefs(vendor.id, (p) => void (p.seenApproved = true));
  const prefs = await getPrefs(vendor.id);
  redirect(prefs.settingsDone ? "/driver/today" : "/driver/settings");
}

export async function finishSettings() {
  const { vendor } = await requireVendor();
  await setPrefs(vendor.id, (p) => void (p.settingsDone = true));
  redirect("/driver/today");
}

/* ----------------------------------- today ----------------------------------- */

export async function setAvailable(on: boolean) {
  const { vendor } = await requireApproved();
  await setPrefs(vendor.id, (p) => void (p.available = on));
  touched();
  refresh();
}

export async function acceptTrip(id: string) {
  const { vendor } = await requireApproved();
  const b = await getMyBooking(id, vendor.id);
  if (!b || !isOffer(b)) redirect("/driver/today");
  await patchTrip(id, vendor.id, (t) => Object.assign(t, { stage: "accepted", answeredAt: new Date().toISOString() }));
  touched();
  redirect(`/driver/trip/${id}`);
}

export async function declineTrip(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { vendor } = await requireApproved();
  const id = str(fd, "id", 60);
  const reason = str(fd, "reason");
  if (!declineReasons.includes(reason)) return { error: "Pick a reason." };
  const b = await getMyBooking(id, vendor.id);
  if (!b || !isOffer(b)) return { error: "This trip is no longer waiting for you." };
  await patchTrip(id, vendor.id, (t) => Object.assign(t, { stage: "declined", declineReason: reason, answeredAt: new Date().toISOString() }));
  touched();
  redirect("/driver/today");
}

export async function closeCancelled(id: string) {
  const { vendor } = await requireApproved();
  await patchTrip(id, vendor.id, (t) => void (t.cancelSeen = true));
  touched();
  redirect("/driver/today");
}

/* ----------------------------------- trip ----------------------------------- */

async function myTrip(id: string) {
  const { vendor } = await requireApproved();
  const b = await getMyBooking(id, vendor.id);
  if (!b || b.status === "cancelled" || !b.trip || b.trip.stage === "offered" || b.trip.stage === "declined") redirect("/driver/today");
  return { vendor, b };
}

export async function startTrip(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id", 60);
  const { vendor, b } = await myTrip(id);
  const km = int(fd, "km");
  if (!Number.isFinite(km) || km <= 0) return { error: "Type the km shown on the meter." };
  const last = lastOdometer(await listMyBookings(vendor.id), b.vendorCarId, id);
  const problem = meterProblem(km, last);
  if (problem) return { error: problem };
  const photo = await saveTripPhoto(fd.get("photo"));
  if ("error" in photo) return { error: `Photo of the meter: ${photo.error}` };
  await patchTrip(id, vendor.id, (t) => Object.assign(t, { stage: "to-pickup", startKm: km, startPhoto: photo.file, startedAt: new Date().toISOString() }));
  touched();
  redirect(`/driver/trip/${id}`);
}

export async function arrived(id: string) {
  const { vendor } = await myTrip(id);
  await patchTrip(id, vendor.id, (t) => {
    if (t.stage === "to-pickup") Object.assign(t, { stage: "waiting", arrivedAt: new Date().toISOString() });
  });
  touched();
  redirect(`/driver/trip/${id}`);
}

export async function whatsappSent(id: string) {
  const { vendor } = await myTrip(id);
  await patchTrip(id, vendor.id, (t) => void (t.whatsappAt = new Date().toISOString()));
  refresh();
}

export async function onBoard(id: string) {
  const { vendor } = await myTrip(id);
  await patchTrip(id, vendor.id, (t) => {
    if (t.stage === "waiting") Object.assign(t, { stage: "on-trip", boardedAt: new Date().toISOString() });
  });
  touched();
  redirect(`/driver/trip/${id}`);
}

export async function customerNotComing(id: string) {
  const { vendor } = await myTrip(id);
  await patchTrip(id, vendor.id, (t) => void (t.noShowAt = new Date().toISOString()));
  touched();
  refresh();
}

export async function reportLocation(id: string, pos: { lat: number; lng: number } | null) {
  const { vendor } = await requireApproved();
  const b = await getMyBooking(id, vendor.id);
  if (!b?.trip || !["to-pickup", "waiting", "on-trip"].includes(b.trip.stage)) return;
  const ok = pos && Number.isFinite(pos.lat) && Number.isFinite(pos.lng) && Math.abs(pos.lat) <= 90 && Math.abs(pos.lng) <= 180;
  await patchTrip(id, vendor.id, (t) => {
    if (ok) Object.assign(t, { location: { lat: pos!.lat, lng: pos!.lng, at: new Date().toISOString() }, locationOff: false });
    else t.locationOff = true;
  });
}

export async function addExpense(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id", 60);
  const { vendor } = await myTrip(id);
  const kind = str(fd, "kind");
  const amount = int(fd, "amount");
  if (!EXPENSE_KINDS.includes(kind)) return { error: "Pick toll, parking or fuel." };
  if (!(amount > 0 && amount <= 50000)) return { error: "Type the amount paid." };
  const photo = await saveTripPhoto(fd.get("receipt"));
  if ("error" in photo) return { error: `Receipt photo: ${photo.error}` };
  await patchTrip(id, vendor.id, (t) => {
    t.expenses = [...(t.expenses ?? []), { kind, amount, note: str(fd, "place", 60) || undefined, receipt: photo.file, at: new Date().toISOString() }];
  });
  touched();
  refresh();
  return { ok: true };
}

export async function removeExpense(id: string, index: number) {
  const { vendor } = await myTrip(id);
  await patchTrip(id, vendor.id, (t) => {
    if (!t.sentAt) t.expenses = (t.expenses ?? []).filter((_, i) => i !== index);
  });
  refresh();
}

export async function endTrip(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id", 60);
  const { vendor, b } = await myTrip(id);
  const km = int(fd, "km");
  const start = b.trip!.startKm ?? 0;
  if (!Number.isFinite(km) || km <= 0) return { error: "Type the km shown on the meter." };
  if (km <= start) return { error: `Lower than the start of this trip, ${start.toLocaleString("en-IN")} km. Check the meter again.` };
  if (km - start > 3000) return { error: "That is a very big jump for one trip. Check the meter again." };
  const hadPhoto = !!b.trip!.endPhoto;
  const file = fd.get("photo");
  let endPhoto = b.trip!.endPhoto;
  if (file instanceof File && file.size > 0) {
    const photo = await saveTripPhoto(file);
    if ("error" in photo) return { error: `Meter photo: ${photo.error}` };
    endPhoto = photo.file;
  } else if (!hadPhoto) return { error: "Add a photo of the meter." };
  const editing = !!b.trip!.paidAt;
  await patchTrip(id, vendor.id, (t) => {
    Object.assign(t, { endKm: km, endPhoto, endedAt: t.endedAt ?? new Date().toISOString() });
    if (!editing) t.stage = "ended";
  });
  touched();
  redirect(`/driver/trip/${id}${editing ? "?step=send" : ""}`);
}

export async function collectPayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id", 60);
  const { vendor, b } = await myTrip(id);
  const method = str(fd, "method");
  if (!["upi", "cash", "office"].includes(method)) return { error: "Pick how the customer paid." };
  const due = amountDue(b);
  let collected = method === "office" ? 0 : due;
  if (method === "cash") {
    collected = int(fd, "cash");
    if (!(collected >= 0)) return { error: "Type the cash you got." };
  }
  await patchTrip(id, vendor.id, (t) =>
    Object.assign(t, { stage: "paid", payment: method as "upi" | "cash" | "office", collected, paidAt: new Date().toISOString() }),
  );
  touched();
  redirect(`/driver/trip/${id}?step=send`);
}

// What the customer pays: the quote plus the driver's tolls and parking.
function amountDue(b: Booking) {
  return (b.quote ?? 0) + (b.trip?.expenses ?? []).reduce((s, x) => s + x.amount, 0);
}

async function entryInput(b: Booking, vendorId: string, note: string): Promise<DriverEntryInput> {
  const t = b.trip!;
  const company = await getCompany();
  return {
    vendorId,
    carId: b.vendorCarId || b.carId || "",
    date: b.date || istDate(t.startedAt ?? new Date().toISOString()),
    bookingId: b.id,
    customer: b.name,
    phone: phoneDigits(b.phone) || undefined,
    from: b.from,
    to: b.to,
    odoStart: t.startKm,
    odoEnd: t.endKm,
    odoStartPhoto: t.startPhoto,
    odoEndPhoto: t.endPhoto,
    startedAt: t.startedAt,
    endedAt: t.endedAt,
    fare: b.quote ?? 0,
    driverCut: t.share,
    expenses: (t.expenses ?? []).map((x) => ({ kind: x.kind, place: x.note, amount: x.amount, receipt: x.receipt, at: x.at })),
    payment:
      t.payment === "upi" || t.payment === "cash"
        ? { method: t.payment, amount: t.collected ?? 0, to: t.payment === "upi" ? company.upi : undefined, at: t.paidAt, received: true }
        : undefined,
    note: [t.payment === "office" ? "Customer pays the office later." : "", t.noShowAt ? "Driver reported the customer late at pickup." : "", note].filter(Boolean).join(" "),
  };
}

// 10.36 Send to office → a Trip log entry tagged "From driver app".
export async function sendToOffice(id: string, note: string): Promise<ActionState> {
  const { vendor } = await requireApproved();
  const b = await getMyBooking(id, vendor.id);
  if (!b?.trip) return { error: "Trip not found." };
  if (b.trip.sentAt) return { ok: true }; // already sent (e.g. a retry after coming back online)
  if (b.trip.stage !== "paid") return { error: "Collect the payment first." };
  const entry = await addDriverEntry(await entryInput(b, vendor.id, note.trim().slice(0, 300)));
  await patchTrip(id, vendor.id, (t) => Object.assign(t, { entryId: entry.id, sentAt: new Date().toISOString() }));
  touched();
  return { ok: true };
}

// 10.39 Fix and send again: a new photo for what the office flagged.
export async function resendFixed(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id", 60);
  const { vendor } = await requireApproved();
  const b = await getMyBooking(id, vendor.id);
  const entryId = b?.trip?.entryId;
  const entry = entryId ? await getEntry(entryId) : undefined;
  if (!b?.trip || !entry || entry.vendorId !== vendor.id || entry.status !== "fix") return { error: "Nothing to fix on this trip." };
  const file = fd.get("photo");
  const target = str(fd, "target"); // "meter" or "expense:<index>"
  if (entry.fixReason !== "other") {
    const photo = await saveTripPhoto(file);
    if ("error" in photo) return { error: photo.error };
    await patchTrip(id, vendor.id, (t) => {
      if (target === "meter") t.endPhoto = photo.file;
      else {
        const i = Number(target.split(":")[1]);
        if (t.expenses?.[i]) t.expenses[i] = { ...t.expenses[i], receipt: photo.file, at: new Date().toISOString() };
      }
    });
  }
  const fresh = (await getMyBooking(id, vendor.id))!;
  const done = await resubmitDriverEntry(entry.id, vendor.id, await entryInput(fresh, vendor.id, str(fd, "note", 300) || entry.note || ""));
  if (!done) return { error: "The office already checked this trip." };
  touched();
  redirect(`/driver/trip/${id}?step=done`);
}
