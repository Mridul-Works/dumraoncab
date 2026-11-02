import { addDays, fmtDate, rangeText, spanDays } from "@/components/admin/analytics/rangeFormat";
import { istDate, type Booking, type BookingSource } from "./bookingTypes";
import { daysBetween, entryNet, inr, type Car } from "./catalogTypes";
import { listCars } from "./fleet";
import { listEntries, type JournalRecord } from "./journal";
import { cancelReasons } from "./site";
import { listBookings } from "./store";
import { listVendors, type Vendor } from "./vendors";

// Analytics (Figma Flow 7): how the business is doing for a date range, worked
// out from bookings (lib/store.ts) and the trip log (lib/journal.ts).
//
// What counts as a trip: every trip-log entry with a fare or a linked booking,
// plus completed bookings that were never logged (their fare is what the driver
// collected, else the quote; their cost is the expenses the driver entered).
// Net = fare − fuel − driver cut (− tolls/other driver expenses). Requests are
// bookings created in the range; cancellations are counted against them.

/* --------------------------------- ranges --------------------------------- */

export type RangeKey = "today" | "yesterday" | "7d" | "month" | "last-month" | "year" | "custom";

export const RANGE_LABELS: Record<Exclude<RangeKey, "custom">, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  month: "This month",
  "last-month": "Last month",
  year: "This year",
};

export type Range = {
  key: RangeKey;
  from: string;
  to: string;
  compare: boolean;
  prevFrom: string;
  prevTo: string;
  label: string; // "1 to 30 Oct"
  prevLabel: string; // "1 to 30 Sep"
  prevShort: string; // "Sep", "last year", "the 7 days before"
};

const validDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

const monthStart = (d: string) => `${d.slice(0, 8)}01`;
const monthEnd = (d: string) => addDays(`${addMonths(monthStart(d), 1)}`, -1);
function addMonths(d: string, n: number) {
  const t = new Date(`${d.slice(0, 8)}01T00:00:00Z`);
  t.setUTCMonth(t.getUTCMonth() + n);
  return t.toISOString().slice(0, 10);
}
const fmt = fmtDate;

// Reads ?range=&from=&to=&cmp= — defaults to this month so far.
export function resolveRange(sp: Record<string, string | undefined>, today = istDate()): Range {
  let key = (sp.range ?? "month") as RangeKey;
  let from = monthStart(today);
  let to = today;
  let prevFrom: string;
  let prevTo: string;
  let prevShort: string;

  if (key === "custom" && validDate(sp.from) && validDate(sp.to)) {
    from = sp.from <= sp.to ? sp.from : sp.to;
    to = sp.from <= sp.to ? sp.to : sp.from;
    if (spanDays(from, to) > 731) from = addDays(to, -730); // two years at most
  } else if (key === "today") from = to = today;
  else if (key === "yesterday") from = to = addDays(today, -1);
  else if (key === "7d") from = addDays(today, -6);
  else if (key === "last-month") {
    from = addMonths(today, -1);
    to = monthEnd(from);
  } else if (key === "year") from = `${today.slice(0, 4)}-01-01`;
  else key = "month";

  const n = spanDays(from, to);
  if (key === "month" || key === "last-month") {
    // Same days of the month before ("1 to 30 Oct" vs "1 to 30 Sep").
    prevFrom = addMonths(from, -1);
    prevTo = [addDays(prevFrom, n - 1), monthEnd(prevFrom)].sort()[0];
    prevShort = fmt(prevFrom, { month: "short" });
  } else if (key === "year") {
    prevFrom = `${Number(from.slice(0, 4)) - 1}${from.slice(4)}`;
    prevTo = `${Number(to.slice(0, 4)) - 1}${to.slice(4)}`;
    prevShort = "last year";
  } else {
    prevTo = addDays(from, -1);
    prevFrom = addDays(prevTo, -(n - 1));
    prevShort = n === 1 ? "the day before" : `the ${n} days before`;
  }

  return {
    key,
    from,
    to,
    compare: key !== "custom" || sp.cmp !== "0",
    prevFrom,
    prevTo,
    label: rangeText(from, to, today),
    prevLabel: rangeText(prevFrom, prevTo, today),
    prevShort,
  };
}

/* --------------------------------- report --------------------------------- */

export type Trip = {
  date: string;
  revenue: number;
  cost: number;
  km: number;
  carId?: string;
  vendorId?: string;
  route: string;
  counted: boolean; // false for own-use log entries (cost only)
};

export type Totals = { revenue: number; trips: number; net: number; avgFare: number };

export type Report = {
  range: Range;
  hasAnyData: boolean; // any booking or trip-log entry at all, ever
  totals: Totals;
  prev: Totals | null;
  chart: { key: string; label: string; value: number }[];
  chartUnit: "day" | "month";
  best: { label: string; value: number } | null;
  sources: { key: BookingSource; label: string; trips: number; pct: number }[];
  requests: number;
  converted: number;
  conversionPct: number | null;
  routes: { route: string; trips: number; revenue: number; avg: number }[];
  cars: { id: string; name: string; trips: number; km: number; net: number }[];
  vendors: { id: string; name: string; trips: number; rating?: number; fares: number }[];
  cancels: { total: number; reasons: { label: string; count: number }[]; noCarNote: string | null };
};

const SOURCE_NAMES: Record<BookingSource, string> = { admin: "Phone calls", "booking-form": "Booking form", "hero-widget": "Home page widget" };

const routeOf = (from: string, to: string, service?: string) => {
  const f = from.trim();
  const t = to.trim();
  if (f && t) return `${f} → ${t}`;
  if (service?.trim()) return `Local · ${service.trim()}`;
  return f ? `Local · ${f}` : "Local";
};

export function buildTrips(entries: JournalRecord[], bookings: Booking[]): Trip[] {
  const logged = new Set(entries.map((e) => e.bookingId).filter(Boolean));
  const trips: Trip[] = entries.map((e) => ({
    date: e.date,
    revenue: e.fare,
    cost: e.fuel + e.driverCut,
    km: e.km ?? 0,
    carId: e.carId,
    vendorId: e.bookingId ? bookings.find((b) => b.id === e.bookingId)?.vendorId : undefined,
    route: routeOf(e.from, e.to),
    counted: e.fare > 0 || !!e.bookingId || !!e.customer,
  }));
  for (const b of bookings) {
    if (b.status !== "completed" || !b.date || logged.has(b.id)) continue;
    const t = b.trip;
    trips.push({
      date: b.date,
      revenue: t?.collected ?? b.quote ?? 0,
      cost: (t?.expenses ?? []).reduce((s, x) => s + (x.amount || 0), 0),
      km: t?.startKm != null && t?.endKm != null && t.endKm > t.startKm ? t.endKm - t.startKm : 0,
      carId: b.carId,
      vendorId: b.vendorId,
      route: routeOf(b.from, b.to, b.service),
      counted: true,
    });
  }
  return trips;
}

function totalsOf(trips: Trip[]): Totals {
  const counted = trips.filter((t) => t.counted);
  const revenue = counted.reduce((s, t) => s + t.revenue, 0);
  const net = trips.reduce((s, t) => s + t.revenue - t.cost, 0);
  return { revenue, trips: counted.length, net, avgFare: counted.length ? Math.round(revenue / counted.length) : 0 };
}

const monthLabel = (m: string) => fmt(`${m}-01`, { month: "short" });
const dayLabel = (d: string) => fmt(d, { weekday: "short", day: "numeric", month: "short" }).replace(",", "");

export function computeReport(range: Range, data: { bookings: Booking[]; entries: JournalRecord[]; cars: Car[]; vendors: Vendor[] }): Report {
  const { bookings, entries, cars, vendors } = data;
  const all = buildTrips(entries, bookings);
  const inRange = (d: string, from = range.from, to = range.to) => d >= from && d <= to;
  const trips = all.filter((t) => inRange(t.date));
  const totals = totalsOf(trips);
  const prevTrips = all.filter((t) => inRange(t.date, range.prevFrom, range.prevTo));
  const prev = range.compare && prevTrips.length ? totalsOf(prevTrips) : null;

  // Revenue chart: by day up to ~2 months, by month beyond.
  const days = daysBetween(range.from, range.to, 800);
  const byMonth = days.length > 62;
  const chartUnit = byMonth ? "month" : "day";
  const buckets = new Map<string, number>();
  for (const d of days) buckets.set(byMonth ? d.slice(0, 7) : d, 0);
  for (const t of trips) if (t.counted) buckets.set(byMonth ? t.date.slice(0, 7) : t.date, (buckets.get(byMonth ? t.date.slice(0, 7) : t.date) ?? 0) + t.revenue);
  const chart = [...buckets].map(([key, value]) => ({ key, value, label: byMonth ? monthLabel(key) : fmt(key, { day: "numeric", month: "short" }) }));
  const top = chart.reduce<(typeof chart)[number] | null>((b, c) => (c.value > (b?.value ?? 0) ? c : b), null);
  const best = top ? { label: byMonth ? fmt(`${top.key}-01`, { month: "long", year: "numeric" }) : dayLabel(top.key), value: top.value } : null;

  // Requests made in the range, and which became trips.
  const requested = bookings.filter((b) => inRange(istDate(b.createdAt)));
  const won = requested.filter((b) => b.status === "confirmed" || b.status === "completed");
  const sources = (Object.keys(SOURCE_NAMES) as BookingSource[]).map((key) => {
    const n = won.filter((b) => b.source === key).length;
    return { key, label: SOURCE_NAMES[key], trips: n, pct: won.length ? Math.round((n / won.length) * 100) : 0 };
  });

  // Top routes by revenue.
  const routeMap = new Map<string, { trips: number; revenue: number }>();
  for (const t of trips.filter((t) => t.counted)) {
    const r = routeMap.get(t.route) ?? { trips: 0, revenue: 0 };
    r.trips++;
    r.revenue += t.revenue;
    routeMap.set(t.route, r);
  }
  const routes = [...routeMap]
    .map(([route, r]) => ({ route, ...r, avg: Math.round(r.revenue / r.trips) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Earnings by car (own fleet).
  const carMap = new Map<string, { trips: number; km: number; net: number }>();
  for (const t of trips) {
    if (!t.carId) continue;
    const c = carMap.get(t.carId) ?? { trips: 0, km: 0, net: 0 };
    if (t.counted) c.trips++;
    c.km += t.km;
    c.net += t.revenue - t.cost;
    carMap.set(t.carId, c);
  }
  const carsOut = [...carMap]
    .map(([id, c]) => ({ id, name: cars.find((x) => x.id === id)?.name ?? "Removed car", ...c }))
    .sort((a, b) => b.net - a.net)
    .slice(0, 6);

  // Vendors: trips their drivers ran in the range.
  const vendorMap = new Map<string, { trips: number; fares: number }>();
  for (const t of trips) {
    if (!t.vendorId || !t.counted) continue;
    const v = vendorMap.get(t.vendorId) ?? { trips: 0, fares: 0 };
    v.trips++;
    v.fares += t.revenue;
    vendorMap.set(t.vendorId, v);
  }
  const vendorsOut = [...vendorMap]
    .map(([id, v]) => {
      const vendor = vendors.find((x) => x.id === id);
      return { id, name: vendor?.name ?? "Removed vendor", rating: vendor?.rating, ...v };
    })
    .sort((a, b) => b.fares - a.fares)
    .slice(0, 5);

  // Cancellations among the range's requests, by reason.
  const cancelled = requested.filter((b) => b.status === "cancelled");
  const reasonCount = new Map<string, number>();
  for (const b of cancelled) {
    const r = b.cancelReason && cancelReasons.includes(b.cancelReason) ? b.cancelReason : "Other reason";
    reasonCount.set(r, (reasonCount.get(r) ?? 0) + 1);
  }
  const reasons = [...reasonCount].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  const noCar = cancelled.filter((b) => b.cancelReason === cancelReasons[1]);
  let noCarNote: string | null = null;
  if (noCar.length) {
    noCarNote = `${noCar.length} lost because no car was free.`;
    const dated = noCar.filter((b) => b.date);
    if (dated.length >= 2) {
      const key = (b: Booking) => {
        const day = fmt(b.date, { weekday: "long" });
        const h = Number((b.time || "12:00").slice(0, 2));
        return `${day} ${h < 12 ? "mornings" : h < 17 ? "afternoons" : "evenings"}`;
      };
      const tally = new Map<string, number>();
      for (const b of dated) tally.set(key(b), (tally.get(key(b)) ?? 0) + 1);
      const [slot, n] = [...tally].sort((a, b) => b[1] - a[1])[0];
      if (n >= 2) noCarNote += ` Most were ${slot}.`;
    }
  }

  return {
    range,
    hasAnyData: bookings.length > 0 || entries.length > 0,
    totals,
    prev,
    chart,
    chartUnit,
    best: best && best.value > 0 ? best : null,
    sources,
    requests: requested.length,
    converted: won.length,
    conversionPct: requested.length ? Math.round((won.length / requested.length) * 100) : null,
    routes,
    cars: carsOut,
    vendors: vendorsOut,
    cancels: { total: cancelled.length, reasons, noCarNote },
  };
}

export async function loadReport(range: Range): Promise<Report> {
  const [bookings, entries, cars, vendors] = await Promise.all([listBookings(), listEntries(), listCars(), listVendors()]);
  return computeReport(range, { bookings, entries, cars, vendors });
}

// The data behind the CSV export: bookings and trip-log entries in the range.
export async function loadRangeRows(range: Range) {
  const [bookings, entries, cars] = await Promise.all([listBookings(), listEntries(), listCars()]);
  const inRange = (d: string) => d >= range.from && d <= range.to;
  return {
    bookings: bookings.filter((b) => inRange(b.date || istDate(b.createdAt))),
    entries: entries.filter((e) => inRange(e.date)).map((e) => ({ ...e, net: entryNet(e) })),
    cars,
  };
}

/* --------------------------------- sharing -------------------------------- */

// Percent change, or null when there's nothing to compare with.
export const delta = (now: number, before: number | undefined) => (before ? Math.round(((now - before) / Math.abs(before)) * 100) : null);
export const signedPct = (n: number) => (n > 0 ? `+${n}%` : n < 0 ? `−${Math.abs(n)}%` : "0%");

// Plain-text summary for "Send on WhatsApp" (opens WhatsApp with this text).
export function reportText(r: Report, businessName: string, reportUrl: string) {
  const t = r.totals;
  const vs = (now: number, before?: number) => {
    const d = delta(now, before);
    return d === null ? "" : ` (${signedPct(d)} vs ${r.range.prevShort})`;
  };
  const lines = [
    `*${businessName} · report for ${r.range.label}*`,
    "",
    `Revenue: ${inr(t.revenue)}${vs(t.revenue, r.prev?.revenue)}`,
    `Trips: ${t.trips}${vs(t.trips, r.prev?.trips)}`,
    `Net earnings: ${inr(t.net)}${vs(t.net, r.prev?.net)}`,
    `Average fare: ${inr(t.avgFare)}`,
  ];
  if (r.requests) lines.push(`Requests: ${r.requests} · ${r.conversionPct}% became trips · ${r.cancels.total} cancelled`);
  if (r.routes[0]) lines.push("", "Top routes:", ...r.routes.slice(0, 3).map((x) => `• ${x.route} — ${x.trips} trip${x.trips === 1 ? "" : "s"}, ${inr(x.revenue)}`));
  if (r.cars[0]) lines.push("", "Best cars (net):", ...r.cars.slice(0, 3).map((c) => `• ${c.name} — ${inr(c.net)}`));
  lines.push("", `Full report: ${reportUrl}`);
  return lines.join("\n");
}
