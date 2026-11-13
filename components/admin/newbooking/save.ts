import { phoneDigits, type Booking } from "@/lib/bookingTypes";
import { routes } from "@/lib/site";
import { bookingRef, durationMin, norm, toMin } from "./format";

// What "Save booking" (createBooking) answers, and the checks it runs before
// writing anything (Figma 3B.14–3B.17). Browser- and server-safe.

export type RepeatInfo = { id: string; ref: string; name: string; from: string; to: string; date: string; time: string; createdAt: string };
export type CarBusyInfo = { car: string; ref: string; from: string; to: string; date: string; start: string; end: string }; // start/end "" = all day

export type NewBookingResult =
  | { error: string }
  | { saved: string } // the new booking's id
  | { repeat: RepeatInfo } // 3B.17: same customer, same pickup day and time
  | { carBusy: CarBusyInfo } // 3B.16: the assigned car is out at that time
  | undefined;

const live = (b: Booking) => b.status !== "cancelled" && b.status !== "completed";
const isTime = (t: string) => /^\d{2}:\d{2}$/.test(t);

// 3B.17: a live booking for the same mobile number, day and pickup time.
export function findRepeat(all: Booking[], digits: string, date: string, time: string): RepeatInfo | undefined {
  if (!digits || !date || !time) return undefined;
  const b = all
    .filter((x) => live(x) && x.date === date && x.time === time && phoneDigits(x.phone) === digits)
    .sort((a, c) => c.createdAt.localeCompare(a.createdAt))[0];
  return b && { id: b.id, ref: bookingRef(b.id), name: b.name, from: b.from, to: b.to, date: b.date, time: b.time, createdAt: b.createdAt };
}

// Minutes from midnight the car is away: pickup → drop → back (there and back
// on the route's time; 3 hours each way when the drop isn't a known route).
// null = no pickup time, so the car counts as taken all day.
function away(time: string, to: string): [number, number] | null {
  if (!isTime(time)) return null;
  const route = to ? routes.find((r) => norm(to).startsWith(norm(r.to))) : undefined;
  const leg = route ? durationMin(route.duration) : 180;
  const start = toMin(time);
  return [start, start + leg * 2];
}

const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// 3B.16: another live booking already has this car (ours, or a vendor's) at an overlapping time.
export function findCarBusy(
  all: Booking[],
  car: { name: string; carId?: string; vendorId?: string; vendorCarId?: string },
  date: string,
  time: string,
  to: string,
): CarBusyInfo | undefined {
  if (!date || (!car.carId && !car.vendorCarId)) return undefined;
  const mine = away(time, to);
  for (const b of all) {
    if (!live(b) || b.date !== date) continue;
    const same = car.carId ? b.carId === car.carId : b.vendorId === car.vendorId && b.vendorCarId === car.vendorCarId;
    if (!same) continue;
    const theirs = away(b.time, b.to);
    if (mine && theirs && (mine[1] <= theirs[0] || theirs[1] <= mine[0])) continue;
    return { car: car.name, ref: bookingRef(b.id), from: b.from, to: b.to, date: b.date, start: theirs ? hhmm(theirs[0]) : "", end: theirs ? hhmm(theirs[1]) : "" };
  }
  return undefined;
}

// "Naya Bazar, Dumraon" → "Naya Bazar"; "Patna Airport (JP Narayan)" → "Patna Airport"
export const shortPlace = (s: string) => s.split(",")[0].replace(/\s*\(.*\)\s*$/, "").trim();

// ISO timestamp → "2 minutes ago", "3 hours ago", "on 12 Oct"
export function ago(iso: string, now = Date.now()) {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return `on ${new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}`;
}
