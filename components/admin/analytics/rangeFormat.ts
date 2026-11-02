// Browser-safe date helpers for Analytics (Figma Flow 7), shared by
// lib/analytics.ts and the range menu. Dates are "YYYY-MM-DD" strings in
// Indian time; arithmetic runs in UTC so it never shifts a day.

export function addDays(d: string, n: number) {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

export const spanDays = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;

export const fmtDate = (d: string, o: Intl.DateTimeFormatOptions) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { ...o, timeZone: "UTC" }).replace("Sept", "Sep");

// "1 to 30 Oct", "28 Sep to 3 Oct", "2 Nov", "1 Dec 2025 to 2 Nov 2026"
// (the year shows only when the range isn't within `today`'s year).
export function rangeText(from: string, to: string, today: string) {
  const yr = to.slice(0, 4) !== today.slice(0, 4) || from.slice(0, 4) !== to.slice(0, 4);
  const end = fmtDate(to, yr ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" });
  if (from === to) return end;
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  const start = fmtDate(
    from,
    sameMonth ? { day: "numeric" } : from.slice(0, 4) === to.slice(0, 4) ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" },
  );
  return `${start} to ${end}`;
}

// "1 Oct 2026" — the custom range fields.
export const longDate = (d: string) => fmtDate(d, { day: "numeric", month: "short", year: "numeric" });
