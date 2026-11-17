import type { Booking } from "@/lib/bookingTypes";

// Shared Dashboard formatting (server page + client cards).

export const REPLY_TARGET_MIN = 15;

export const panelHref = (b: Pick<Booking, "id">) => `/admin/bookings?id=${b.id}`;

// "09:00" → "09:00 AM"
export function clock(t: string) {
  if (!/^\d{2}:\d{2}/.test(t)) return t || "—";
  const h = Number(t.slice(0, 2));
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${t.slice(3, 5)} ${h < 12 ? "AM" : "PM"}`;
}

// IST minutes since the epoch for a "YYYY-MM-DD" + "HH:MM" pair.
export const istMinutes = (date: string, time = "00:00") => Date.parse(`${date}T${time}:00+05:30`) / 60000;

export function duration(min: number) {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  // Past a day, hours read badly ("217 h 45 min"): say days.
  if (m >= 24 * 60) {
    const d = Math.floor(m / (24 * 60));
    return d === 1 ? "1 day" : `${d} days`;
  }
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${String(r).padStart(2, "0")} min` : `${h} h`;
}

// "2026-10-31" → "Sat 31 Oct"
export const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" }).replace(",", "");

export const route = (b: Pick<Booking, "from" | "to">) => (b.to ? `${b.from} → ${b.to}` : b.from || "No pickup yet");

// Hourly rental package from the booking ("8 hr / 80 km in Buxar" in the
// notes) — only for local trips (no drop).
export function localPackage(b: Pick<Booking, "to" | "notes">) {
  if (b.to) return null;
  const m = /(\d+)\s*hr\s*\/\s*(\d+)\s*km/i.exec(b.notes || "");
  return m ? { label: `${m[1]} hr / ${m[2]} km`, hours: Number(m[1]) } : null;
}

// Timeline route (Figma 2.1): "Dumraon (local) · 8 hr / 80 km" for an hourly
// rental, otherwise "Dumraon → Buxar".
export function pickupRoute(b: Pick<Booking, "from" | "to" | "notes">) {
  if (b.to || !b.from) return route(b);
  const pkg = localPackage(b);
  return `${b.from} (local)${pkg ? ` · ${pkg.label}` : ""}`;
}

// When a car on an hourly rental is due back (Figma 2.1 "On trip · back
// 5:00 PM"): start + package hours. Null when the return isn't known.
// `today` is the IST date; later days read "tomorrow" or "Sat 31 Oct".
export function backLabel(b: Pick<Booking, "to" | "notes" | "date" | "time" | "trip">, today: string, tomorrow: string) {
  const pkg = localPackage(b);
  if (!pkg) return null;
  const start = b.trip?.startedAt ? Date.parse(b.trip.startedAt) : b.date && b.time ? istMinutes(b.date, b.time) * 60000 : NaN;
  if (!Number.isFinite(start)) return null;
  const ist = new Date(start + pkg.hours * 3600000 + 5.5 * 3600000).toISOString();
  const day = ist.slice(0, 10);
  if (day === today) return clock(ist.slice(11, 16)).replace(/^0/, "");
  return day === tomorrow ? "tomorrow" : dayLabel(day).replace(/ 0/, " ");
}
