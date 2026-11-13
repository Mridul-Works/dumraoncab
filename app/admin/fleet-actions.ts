"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";
import { CAR_TYPES, type Car, type CarType } from "@/lib/catalogTypes";
import { putUpload, removeUpload } from "@/lib/db";
import { getFares } from "@/lib/fares";
import { FORM_FIELDS, createCar, deleteCar, formSnapshot, getCar, updateCar, upcomingTrips, type CarFormSnapshot } from "@/lib/fleet";
import { field, isDate, money, publishSite, refreshAdmin, type FormState } from "./form";

// Add/edit car form result. `conflict`: the car was changed on another computer
// since the form opened (Figma 4.10). `saveFailed`: storage write failed (4.8).
export type CarFormState =
  | {
      error?: string;
      saveFailed?: boolean;
      conflict?: { changed: (keyof CarFormSnapshot)[]; latest: CarFormSnapshot; at?: string; by?: string };
    }
  | undefined;

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_PHOTO = 5 * 1024 * 1024;

const validImage = (src: string) => /^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(src) || /^https:\/\/\S+$/.test(src);

// Add car + Edit car share one form.
export async function saveCar(_prev: CarFormState, formData: FormData): Promise<CarFormState> {
  const { email } = await requireAdmin();
  const id = field(formData, "id", 64);
  const name = field(formData, "name", 60);
  const type = field(formData, "type", 20) as CarType;
  const image = field(formData, "image", 500);
  const fareClass = field(formData, "fareClass", 40);

  if (!name) return { error: "Give the car a name, e.g. “Scorpio VLX”." };
  if (!CAR_TYPES.includes(type)) return { error: "Choose a car type." };
  if (!image) return { error: "Add a photo — the public car card needs one." };
  if (!validImage(image)) return { error: "The photo must be an uploaded file or an https:// link." };
  if (fareClass && !(await getFares()).perKm.some((c) => c.id === fareClass)) return { error: "Choose a fare class." };

  const input = {
    name,
    number: field(formData, "number", 20).toUpperCase(),
    type,
    seats: field(formData, "seats", 30),
    transmission: field(formData, "transmission", 30),
    fuel: field(formData, "fuel", 30),
    fareClass,
    image,
    note: field(formData, "note", 160),
    shown: formData.get("shown") === "on",
    verified: formData.get("verified") === "on",
  };

  let savedId = id;
  try {
    if (id) {
      const current = await getCar(id);
      if (!current) return { error: "This car was deleted on another computer." };
      // Someone else saved this car while the form was open: ask before overwriting.
      const conflict = formData.get("force") === "1" ? undefined : changedSince(field(formData, "base", 4000), current);
      if (conflict) return { conflict };
      if (!(await updateCar(id, input, email))) return { error: "This car was deleted on another computer." };
    } else {
      savedId = (await createCar(input, email)).id;
    }
  } catch {
    return { saveFailed: true, error: "Couldn’t save the car. Check the internet connection and try again — your changes are still here." };
  }
  publishSite();
  redirect(`/admin/fleet?saved=${encodeURIComponent(savedId)}`);
}

// Form fields that differ between the snapshot the form opened with and the
// stored car. Service/odometer updates don't count.
function changedSince(baseJson: string, current: Car): NonNullable<CarFormState>["conflict"] {
  let base: Partial<CarFormSnapshot>;
  try {
    base = JSON.parse(baseJson);
  } catch {
    return undefined; // no snapshot (old tab): save as before
  }
  const latest = formSnapshot(current);
  const changed = FORM_FIELDS.filter((k) => k in base && base[k] !== latest[k]);
  return changed.length ? { changed, latest, at: current.updatedAt, by: current.updatedBy } : undefined;
}

// "Shown on site" switch on the car grid.
export async function setCarShown(id: string, shown: boolean) {
  const { email } = await requireAdmin();
  await updateCar(id, { shown }, email);
  publishSite();
}

export async function removeCar(id: string): Promise<{ error?: string; trips?: number } | void> {
  await requireAdmin();
  // Figma 4.9: a car with trips coming up can't be deleted.
  const trips = await upcomingTrips(id);
  if (trips.length) return { trips: trips.length, error: "This car has trips coming up. Move them to another car first." };
  const car = await deleteCar(id);
  if (car?.image.startsWith("/uploads/")) {
    await removeUpload("uploads", car.image.slice("/uploads/".length));
  }
  publishSite();
  redirect(car ? `/admin/fleet?deleted=${encodeURIComponent(car.name)}` : "/admin/fleet");
}

// Photo upload from the car form. Saved under data/uploads and served by app/uploads/[file].
export async function uploadCarPhoto(formData: FormData): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo first." };
  const ext = PHOTO_TYPES[file.type];
  if (!ext) return { error: "Use a JPG, PNG or WebP photo." };
  if (file.size > MAX_PHOTO) return { error: "That photo is over 5 MB — please use a smaller one." };

  const bytes = Buffer.from(await file.arrayBuffer());
  // Check the file really is the image type it claims to be.
  const magic = bytes.subarray(0, 12).toString("hex");
  const real =
    (ext === "jpg" && magic.startsWith("ffd8ff")) ||
    (ext === "png" && magic.startsWith("89504e47")) ||
    (ext === "webp" && magic.startsWith("52494646") && magic.slice(16, 24) === "57454250");
  if (!real) return { error: "That file doesn't look like a valid image." };

  const name = `${randomUUID()}.${ext}`;
  await putUpload("uploads", name, bytes);
  return { url: `/uploads/${name}` };
}

// Journal one-car view: odometer reading and next service.
export async function saveService(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = field(formData, "id", 64);
  const odometer = field(formData, "odometerKm", 12);
  const nextKm = field(formData, "nextServiceKm", 12);
  const nextDate = field(formData, "nextServiceDate", 10);
  const today = field(formData, "today", 10);
  if (nextDate && !isDate(nextDate)) return { error: "Pick a valid service date." };

  const car = await getCar(id);
  if (!car) return { error: "This car was deleted." };
  // Blank odometer = keep the last reading. A new reading counts from today;
  // journal km logged after today add on top of it.
  const reading = odometer === "" ? {} : { odometerKm: money(formData, "odometerKm"), odometerDate: isDate(today) ? today : undefined };

  await updateCar(id, {
    ...reading,
    nextServiceKm: nextKm === "" ? undefined : money(formData, "nextServiceKm"),
    nextServiceDate: nextDate || undefined,
  });
  refreshAdmin();
  return { ok: true };
}
