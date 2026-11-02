import { jsonFile } from "./db";
import type { Car } from "./catalogTypes";
import { seedFleet } from "./site";

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
