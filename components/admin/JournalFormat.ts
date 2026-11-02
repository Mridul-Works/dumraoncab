// Formatting helpers shared by the Trip log page (server) and its client
// components. Plain functions only — no "use client", no Node imports.

const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { ...o, timeZone: "UTC" });

// "1 – 29 Oct 2026", "28 Sept – 3 Oct 2026", "29 Oct 2026"
export function rangeLabel(from: string, to: string) {
  if (from === to) return fmt(to, { day: "numeric", month: "short", year: "numeric" });
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const start = fmt(from, sameMonth ? { day: "numeric" } : sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
  return `${start} – ${fmt(to, { day: "numeric", month: "short", year: "numeric" })}`;
}

// "09:00" → "9:00 AM"
export function time12(t: string) {
  if (!/^\d{2}:\d{2}$/.test(t)) return t;
  const h = Number(t.slice(0, 2));
  return `${h % 12 || 12}:${t.slice(3)} ${h < 12 ? "AM" : "PM"}`;
}

// ISO timestamp → Indian time "7:27 AM"
export function istTime12(iso: string | undefined) {
  if (!iso || Number.isNaN(Date.parse(iso))) return "";
  return time12(new Date(Date.parse(iso) + 5.5 * 60 * 60 * 1000).toISOString().slice(11, 16));
}

// "Sat 31 Oct"
export const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).replace(",", "");
