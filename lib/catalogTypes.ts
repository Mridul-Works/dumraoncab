// Browser-safe types and helpers for the fleet, fares and daily journal —
// shared by the stores, server actions and client components.

/* ---------------------------------- money ---------------------------------- */

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/* ---------------------------------- fleet ---------------------------------- */

export const CAR_TYPES = ["SUV", "MUV", "Compact SUV", "Hatchback", "Utility"] as const;
export type CarType = (typeof CAR_TYPES)[number];

export type Car = {
  id: string; // url slug, stable once created
  name: string; // model as shown on the site, e.g. "Scorpio VLX"
  number: string; // registration plate, e.g. "BR 44 A 1234" — admin only
  type: CarType;
  seats: string;
  transmission: string;
  fuel: string;
  fareClass: string; // FareClass id; "" = rate on request
  image: string; // Cloudinary URL or /uploads/… file
  note: string; // one-liner on the public car card
  shown: boolean; // listed on the public site
  // Service tracking (set from the journal's one-car view)
  odometerKm?: number; // reading at odometerDate
  odometerDate?: string;
  nextServiceKm?: number;
  nextServiceDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CarSeed = Omit<Car, "number" | "shown" | "createdAt" | "updatedAt">;

// Only images next/image is configured to optimise; anything else renders as-is.
export const optimisableImage = (src: string) => src.startsWith("https://res.cloudinary.com/dwfe5swye/");

export const carLabel = (c: Pick<Car, "name" | "number">) => (c.number ? `${c.name} · ${c.number}` : c.name);

/* ---------------------------------- fares ---------------------------------- */

export type FareClass = { id: string; name: string; rate: number }; // ₹ per km
export type HourlyPackage = { id: string; name: string; for: string; price: number };

export type Fares = {
  perKm: FareClass[];
  hourly: HourlyPackage[];
  routes: Record<string, number>; // route slug → "from" fare
  nightAllowance: number; // ₹ per night, outstation
  rules: string[]; // other fare rules shown under the fare tables
  updatedAt?: string;
};

export const perKmLabel = (rate: number) => `${inr(rate)}/km`;

export function rateForCar(car: Pick<Car, "fareClass">, fares: Fares): string {
  const cls = fares.perKm.find((c) => c.id === car.fareClass);
  return cls ? perKmLabel(cls.rate) : "On request";
}

/* --------------------------------- journal --------------------------------- */

export type JournalEntry = {
  id: string;
  date: string; // YYYY-MM-DD (IST)
  carId: string;
  bookingId?: string;
  customer: string;
  from: string;
  to: string;
  km?: number;
  fare: number;
  fuel: number;
  driverCut: number;
  note: string;
  createdAt: string;
  updatedAt?: string;
};

export const entryNet = (e: Pick<JournalEntry, "fare" | "fuel" | "driverCut">) => e.fare - e.fuel - e.driverCut;

/* ------------------------------ service status ------------------------------ */

export type ServiceState = { level: "ok" | "soon" | "due" | "unset"; label: string; kmNow?: number };

// "Due soon" thresholds: within a week or 500 km.
const SOON_DAYS = 7;
const SOON_KM = 500;

export function serviceState(car: Car, entries: JournalEntry[], today: string): ServiceState {
  if (!car.nextServiceDate && car.nextServiceKm == null) return { level: "unset", label: "No service date set" };

  // Odometer estimate: last reading + journal km logged after it.
  let kmNow: number | undefined;
  if (car.odometerKm != null) {
    const since = car.odometerDate ?? "";
    kmNow =
      car.odometerKm +
      entries.filter((e) => e.carId === car.id && e.date > since).reduce((sum, e) => sum + (e.km ?? 0), 0);
  }

  const parts: string[] = [];
  let level: ServiceState["level"] = "ok";
  if (car.nextServiceDate) {
    const days = Math.round((Date.parse(car.nextServiceDate) - Date.parse(today)) / 86_400_000);
    if (days < 0) level = "due";
    else if (days <= SOON_DAYS) level = "soon";
    parts.push(days < 0 ? `${-days}d overdue` : days === 0 ? "due today" : `in ${days}d`);
  }
  if (car.nextServiceKm != null && kmNow != null) {
    const left = car.nextServiceKm - kmNow;
    if (left <= 0) level = "due";
    else if (left <= SOON_KM && level === "ok") level = "soon";
    parts.push(left <= 0 ? `${(-left).toLocaleString("en-IN")} km over` : `${left.toLocaleString("en-IN")} km left`);
  } else if (car.nextServiceKm != null) {
    parts.push(`at ${car.nextServiceKm.toLocaleString("en-IN")} km`);
  }
  return { level, label: parts.join(" · "), kmNow };
}

/* ---------------------------------- dates ---------------------------------- */

// Every YYYY-MM-DD from `from` to `to` inclusive (capped to keep loops bounded).
export function daysBetween(from: string, to: string, cap = 400): string[] {
  const out: string[] = [];
  let t = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  while (t <= end && out.length < cap) {
    out.push(new Date(t).toISOString().slice(0, 10));
    t += 86_400_000;
  }
  return out;
}

export const shortDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export const weekday = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" });
