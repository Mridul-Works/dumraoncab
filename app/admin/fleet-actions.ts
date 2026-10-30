"use server";

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";
import { CAR_TYPES, type CarType } from "@/lib/catalogTypes";
import { DATA_DIR } from "@/lib/db";
import { getFares } from "@/lib/fares";
import { createCar, deleteCar, getCar, updateCar } from "@/lib/fleet";
import { field, isDate, money, publishSite, refreshAdmin, type FormState } from "./form";

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_PHOTO = 4 * 1024 * 1024;

const validImage = (src: string) => /^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(src) || /^https:\/\/\S+$/.test(src);

// Add car + Edit car share one form.
export async function saveCar(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
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
  };

  let savedId = id;
  if (id) {
    if (!(await updateCar(id, input))) return { error: "This car was deleted." };
  } else {
    savedId = (await createCar(input)).id;
  }
  publishSite();
  redirect(`/admin/fleet?saved=${encodeURIComponent(savedId)}`);
}

// "Shown on site" switch on the car grid.
export async function setCarShown(id: string, shown: boolean) {
  await requireAdmin();
  await updateCar(id, { shown });
  publishSite();
}

export async function removeCar(id: string) {
  await requireAdmin();
  const car = await deleteCar(id);
  if (car?.image.startsWith("/uploads/")) {
    await fs.rm(path.join(DATA_DIR, car.image), { force: true }).catch(() => {});
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
  if (file.size > MAX_PHOTO) return { error: "That photo is over 4 MB — please use a smaller one." };

  const bytes = Buffer.from(await file.arrayBuffer());
  // Check the file really is the image type it claims to be.
  const magic = bytes.subarray(0, 12).toString("hex");
  const real =
    (ext === "jpg" && magic.startsWith("ffd8ff")) ||
    (ext === "png" && magic.startsWith("89504e47")) ||
    (ext === "webp" && magic.startsWith("52494646") && magic.slice(16, 24) === "57454250");
  if (!real) return { error: "That file doesn't look like a valid image." };

  const name = `${randomUUID()}.${ext}`;
  await fs.mkdir(path.join(DATA_DIR, "uploads"), { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, "uploads", name), bytes);
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
