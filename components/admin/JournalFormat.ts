// Formatting helpers shared by the journal page (server) and its client
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
