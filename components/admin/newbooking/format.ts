import { bookingRef as sharedBookingRef } from "@/components/admin/BookingFormat";
// Pure helpers for the New booking flow (Figma "Flow 3B"), shared by the form,
// its pickers and the "Booking saved" page. Browser- and server-safe.

/* ----------------------------------- time ----------------------------------- */

export const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const fromMin = (m: number) => {
  const x = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};

// "04:30" → "4:30 AM" (pad → "04:30 AM")
export const clock = (t: string, pad = false) => {
  const m = toMin(t);
  const h = Math.floor(m / 60) % 12 || 12;
  return `${pad ? String(h).padStart(2, "0") : h}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "AM" : "PM"}`;
};

// Every 15 minutes of the day, "00:00" … "23:45".
export const SLOTS = Array.from({ length: 96 }, (_, i) => fromMin(i * 15));

// What staff type into the time box: "4:30", "430", "4.30 pm", "16:30", "4 pm".
// Returns "HH:MM" or "" when it isn't a time.
export function parseTime(s: string): string {
  const m = s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .match(/^(\d{1,2})(?:[:. ]?(\d{2}))?\s*(a|am|a\.m\.|p|pm|p\.m\.)?$/);
  if (!m) return "";
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return "";
  if (m[3]) {
    if (h < 1 || h > 12) return "";
    h = (h % 12) + (m[3].startsWith("p") ? 12 : 0);
  }
  return fromMin(h * 60 + min);
}

// "180" → "3 hours", "50" → "50 min", "100" → "1 h 40 min"
export const hoursWords = (min: number) =>
  min < 60 ? `${min} min` : min % 60 === 0 ? `${min / 60} hour${min === 60 ? "" : "s"}` : `${Math.floor(min / 60)} h ${min % 60} min`;

// Route durations from lib/site.ts: "≈ 3 hr" → 180, "≈ 50 min" → 50, "≈ 1.5 hr" → 90
export function durationMin(duration: string): number {
  const n = Number(duration.match(/[\d.]+/)?.[0] ?? 0);
  return /hr|hour/i.test(duration) ? Math.round(n * 60) : Math.round(n);
}

/* ----------------------------------- dates ---------------------------------- */

export const day = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });

export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// "2026-10-31" → "Sat 31 Oct"
export const dayShort = (iso: string) => (iso ? day(iso, { weekday: "short", day: "numeric", month: "short" }).replace(",", "") : "");

/* ---------------------------------- people ---------------------------------- */

// "9431180276" → "94311 80276"
export const phoneShow = (d: string) => (d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d);

export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Short booking reference shown to staff and customers ("DC-3F9A").
// Same reference everywhere (list, drawer, PDF, saved page).
export const bookingRef = (id: string) => sharedBookingRef({ id });

/* ------------------------------ booking extras ------------------------------- */

// createBooking folds the extras the booking record has no field for into the
// two note strings (" · "-joined, in a fixed order). This reads them back.
export function bookingExtras(notes: string, adminNote = "") {
  let rest = notes;
  let bags = 0;
  let flight = "";
  let round = false;
  const bagsM = rest.match(/(?:^| · )(\d+) bags?$/);
  if (bagsM) {
    bags = Number(bagsM[1]);
    rest = rest.slice(0, bagsM.index);
  }
  const flightM = rest.match(/(?:^| · )Flight\/train: (.+)$/);
  if (flightM) {
    flight = flightM[1];
    rest = rest.slice(0, flightM.index);
  }
  const roundM = rest.match(/(?:^| · )Round trip$/);
  if (roundM) {
    round = true;
    rest = rest.slice(0, roundM.index);
  }
  const channel = adminNote.match(/Via (phone call|whatsapp|walk-in)/i)?.[1]?.toLowerCase() ?? "";
  const payment = adminNote.match(/Payment: ([A-Za-z ]+?)(?: · |$)/)?.[1]?.trim() ?? "";
  return { note: rest.trim(), bags, flight, round, channel, payment };
}
