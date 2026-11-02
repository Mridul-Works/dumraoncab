import { CAR_DOCS, DOC_LABELS, OPTIONAL_DOCS, PERSON_DOCS, type Vendor, type VendorCar, type VendorDoc } from "@/lib/vendorTypes";
import { istDate, type Booking } from "@/lib/bookingTypes";

// Browser-safe display helpers for the driver app (Figma Flow 10).

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const IST = 5.5 * 60 * 60 * 1000;

// ₹3,414
export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
// 48,312
export const num = (n: number) => Math.round(n).toLocaleString("en-IN");

// "2026-10-31" → "Sat 31 Oct"
export function fmtDay(d: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d || "";
  const [y, m, day] = d.split("-").map(Number);
  return `${DAYS[new Date(Date.UTC(y, m - 1, day)).getUTCDay()]} ${day} ${MONTHS[m - 1]}`;
}

// "2026-10-31" → "31 Oct"
export function fmtShort(d: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d || "";
  const [, m, day] = d.split("-").map(Number);
  return `${day} ${MONTHS[m - 1]}`;
}

// "2026-11-14" → "14 Nov 2026"
export function fmtLong(d: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d || "";
  const [y, m, day] = d.split("-").map(Number);
  return `${day} ${MONTHS[m - 1]} ${y}`;
}

// "04:30" → "4:30 AM"
export function fmtTime(t: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || "");
  if (!m) return t || "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

// ISO timestamp → "7:27 AM" in Indian time
export const clockOf = (iso: string) => fmtTime(new Date(Date.parse(iso) + IST).toISOString().slice(11, 16));
// ISO timestamp → "2026-10-31" in Indian time
export const dayOf = (iso: string) => istDate(iso);

// "Sat 31 Oct · 4:30 AM"
export const when = (b: Pick<Booking, "date" | "time">) => [fmtDay(b.date), fmtTime(b.time)].filter(Boolean).join(" · ");

// Today / Tomorrow / "In 38 min" chip for the next trip.
export function dayChip(date: string) {
  if (date === istDate()) return "Today";
  if (date === istDate(1)) return "Tomorrow";
  return fmtDay(date);
}

export function greeting(): string {
  const h = new Date(Date.now() + IST).getUTCHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "DC";

// "Sanjay Prasad" → "Sanjay ji"
export const respectful = (name: string) => (name.trim() ? `${firstName(name)} ji` : "the customer");

// "Mahindra Scorpio N" → "Scorpio N"
export const shortModel = (model: string) => model.replace(/^(Mahindra|Maruti|Maruti Suzuki|Toyota|Hyundai|Tata|Kia|Honda)\s+/i, "");

export const carLine = (c: VendorCar) => `${shortModel(c.model)} · ${c.number}`;

/* ------------------------------ documents ------------------------------ */

export const daysUntil = (d: string) => Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${istDate()}T00:00:00Z`)) / 86400000);
export const isExpired = (doc: VendorDoc) => !!doc.validTill && daysUntil(doc.validTill) < 0;
export const expiresSoon = (doc: VendorDoc) => !!doc.validTill && daysUntil(doc.validTill) >= 0 && daysUntil(doc.validTill) <= 30;

export type DocRef = { doc: VendorDoc; car?: VendorCar; label: string };

// Every document the driver needs, with a placeholder for the missing ones.
export function allDocs(v: Pick<Vendor, "docs" | "cars">, includeOptional = false): DocRef[] {
  const out: DocRef[] = [];
  for (const kind of PERSON_DOCS) {
    if (kind === "photo") continue;
    const doc = v.docs.find((d) => d.kind === kind) ?? { kind, status: "missing" as const };
    if (doc.status === "missing" && !includeOptional && OPTIONAL_DOCS.includes(kind)) continue;
    out.push({ doc, label: DOC_LABELS[kind] });
  }
  for (const car of v.cars) {
    for (const kind of CAR_DOCS) {
      const doc = car.docs.find((d) => d.kind === kind) ?? { kind, status: "missing" as const };
      out.push({ doc, car, label: carDocLabel(kind) });
    }
  }
  return out;
}

export const carDocLabel = (kind: VendorDoc["kind"]) => (kind === "rc" ? "RC" : kind === "puc" ? "PUC" : DOC_LABELS[kind]);

// Shortest name for a document in sentences: "PUC", "Aadhaar", "licence".
export const docShort = (kind: VendorDoc["kind"]) =>
  ({ photo: "photo", aadhaar: "Aadhaar", licence: "licence", pan: "PAN", rc: "RC", insurance: "insurance", permit: "permit", puc: "PUC" })[kind];

// The first required document that has expired (Trips paused, 10.47).
export function expiredDoc(v: Pick<Vendor, "docs" | "cars">): DocRef | undefined {
  return allDocs(v).find((r) => isExpired(r.doc));
}

// Soonest document expiring within 30 days (10.44 / 10.46 banner).
export function expiringDoc(v: Pick<Vendor, "docs" | "cars">): DocRef | undefined {
  return allDocs(v)
    .filter((r) => expiresSoon(r.doc))
    .sort((a, b) => a.doc.validTill!.localeCompare(b.doc.validTill!))[0];
}

// "Valid till 14 Nov 2026" / "BR 44 G 4417" / "Ending 6021" …
export function docDetail(r: DocRef): string {
  const d = r.doc;
  if (d.status === "missing") return "Not added yet";
  if (d.kind === "aadhaar" && d.number) return `Ending ${d.number.replace(/\D/g, "").slice(-4)}`;
  if (d.kind === "rc" && r.car) return r.car.number;
  if (d.validTill) return `${d.note ? `${d.note} · ` : ""}Valid till ${fmtLong(d.validTill)}`;
  return d.note || d.fileName || "Added";
}
