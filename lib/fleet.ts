import { jsonFile } from "./db";
import type { Car } from "./catalogTypes";
import { seedFleet } from "./site";
import { istDate, tripKey, type Booking } from "./bookingTypes";
import { listBookings } from "./store";

// Fleet store (data/fleet.json). Until staff save a change, the fleet is the
// seed list in lib/site.ts.

const db = jsonFile<Car[]>("fleet.json", () => seedFleet.map((c) => ({ ...c, number: "", shown: true })));

export async function listCars(): Promise<Car[]> {
  return db.read();
}

export async function getCar(id: string): Promise<Car | undefined> {
  return (await db.read()).find((c) => c.id === id);
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "car";

export type CarInput = Omit<Car, "id" | "createdAt" | "updatedAt" | "updatedBy" | "odometerKm" | "odometerDate" | "nextServiceKm" | "nextServiceDate">;

// `by` is the admin email shown as "Last updated … by …" on the edit page.
export function createCar(input: CarInput, by?: string) {
  return db.mutate((list) => {
    const base = slugify(input.number ? `${input.name} ${input.number.slice(-4)}` : input.name);
    let id = base;
    for (let n = 2; list.some((c) => c.id === id); n++) id = `${base}-${n}`;
    const car: Car = { ...input, id, createdAt: new Date().toISOString(), ...(by ? { updatedBy: by } : {}) };
    list.push(car);
    return car;
  });
}

export function updateCar(id: string, patch: Partial<Omit<Car, "id" | "createdAt" | "updatedBy">>, by?: string) {
  return db.mutate((list) => {
    const car = list.find((c) => c.id === id);
    if (!car) return null;
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) delete (car as Record<string, unknown>)[key];
      else (car as Record<string, unknown>)[key] = value;
    }
    car.updatedAt = new Date().toISOString();
    if (by) car.updatedBy = by;
    return car;
  });
}

export function deleteCar(id: string) {
  return db.mutate((list) => {
    const i = list.findIndex((c) => c.id === id);
    if (i === -1) return null;
    return list.splice(i, 1)[0];
  });
}

// Trips still to run in this car (Figma 4.9: a car with trips coming up can't
// be deleted). Live bookings dated today or later, soonest first.
export async function upcomingTrips(carId: string): Promise<Booking[]> {
  const today = istDate();
  return (await listBookings())
    .filter((b) => b.carId === carId && b.date >= today && (b.status === "new" || b.status === "contacted" || b.status === "confirmed"))
    .sort((a, b) => tripKey(a).localeCompare(tripKey(b)));
}

// The fields the add/edit form shows. Used to spot a car changed on another
// computer while the form was open (Figma 4.10).
export const FORM_FIELDS = ["name", "number", "type", "seats", "transmission", "fuel", "fareClass", "image", "note", "shown", "verified"] as const;
export type CarFormSnapshot = Pick<Car, (typeof FORM_FIELDS)[number]>;

export const formSnapshot = (c: Car): CarFormSnapshot => ({
  name: c.name,
  number: c.number,
  type: c.type,
  seats: c.seats,
  transmission: c.transmission,
  fuel: c.fuel,
  fareClass: c.fareClass,
  image: c.image,
  note: c.note,
  shown: c.shown,
  verified: c.verified ?? true,
});
