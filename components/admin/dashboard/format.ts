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
