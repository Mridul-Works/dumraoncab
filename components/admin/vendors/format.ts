// Browser-safe formatting helpers for the admin Vendors screens (Figma Flow 6).
import {
  CAR_DOCS,
  DOC_LABELS,
  PERSON_DOCS,
  REQUIRED_PERSON_DOCS,
  daysLeft,
  docBadge,
  findDoc,
  type Vendor,
  type VendorCar,
  type VendorDoc,
} from "@/lib/vendorTypes";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// IST wall-clock parts of an ISO timestamp (or of a YYYY-MM-DD date).
function ist(at: string) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(at) ? new Date(`${at}T00:00:00Z`) : new Date(Date.parse(at) + 5.5 * 36e5);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), dow: d.getUTCDay(), h: d.getUTCHours(), min: d.getUTCMinutes() };
}

export const istToday = () => new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);

export function dayMonth(at: string) {
  const p = ist(at);
  return `${String(p.d).padStart(2, "0")} ${MONTHS[p.m]}`.replace(/^0/, "");
}
// "12 Mar 2031" (padded day, as on documents: "02 Mar 2027")
export function fullDate(at: string, pad = false) {
  const p = ist(at);
  return `${pad ? String(p.d).padStart(2, "0") : p.d} ${MONTHS[p.m]} ${p.y}`;
}
export const weekdayDate = (at: string) => {
  const p = ist(at);
  return `${DAYS[p.dow]} ${p.d} ${MONTHS[p.m]}`;
};
export function clock(at: string) {
  const p = ist(at);
  return `${p.h % 12 || 12}:${String(p.min).padStart(2, "0")} ${p.h < 12 ? "AM" : "PM"}`;
}
export const dayTime = (at: string) => `${dayMonth(at)}, ${clock(at)}`;

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

export function maskAadhaar(n?: string) {
  const d = (n ?? "").replace(/\D/g, "");
  return d.length >= 4 ? `XXXX XXXX ${d.slice(-4)}` : "";
}
export function maskPan(p?: string) {
  const s = (p ?? "").replace(/\s/g, "").toUpperCase();
  return s.length === 10 ? `XXXXX ${s.slice(5, 9)} ${s.slice(9)}` : s;
}

// wa.me link to a vendor's own number (Indian mobiles).
export function vendorWa(mobile: string, text: string) {
  const d = mobile.replace(/\D/g, "").slice(-10);
  return `https://wa.me/91${d}?text=${encodeURIComponent(text)}`;
}
export const telHref = (mobile: string) => `tel:+91${mobile.replace(/\D/g, "").slice(-10)}`;

export const placeLine = (v: Vendor) => [v.address?.town, v.address?.district].filter(Boolean).join(", ");

export const docUrl = (file: string) => `/admin/vendor-docs/${file}`;

// Straight-line distance in km between two pins.
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371;
}

// ---- Documents ----------------------------------------------------------------

export type DocRef = { carId?: string; kind: VendorDoc["kind"] };
export type DocItem = { ref: DocRef; doc: VendorDoc; car?: VendorCar; label: string };

// Every document slot of a vendor, person first, then car by car.
export function allDocs(v: Vendor): DocItem[] {
  const person = PERSON_DOCS.map((kind) => ({
    ref: { kind },
    doc: findDoc(v.docs, kind) ?? { kind, status: "missing" as const },
    label: DOC_LABELS[kind],
  }));
  const cars = v.cars.flatMap((car) =>
    CAR_DOCS.map((kind) => ({ ref: { carId: car.id, kind }, doc: findDoc(car.docs, kind) ?? { kind, status: "missing" as const }, car, label: DOC_LABELS[kind] })),
  );
  return [...person, ...cars];
}

// Short names used in sentences: "Aadhaar card", "the RC of BR 44 AB 1234".
const shortName: Record<VendorDoc["kind"], string> = {
  photo: "profile photo",
  aadhaar: "Aadhaar",
  licence: "driving licence",
  pan: "PAN card",
  rc: "RC",
  insurance: "insurance",
  permit: "permit",
  puc: "PUC",
};
export const docPhrase = (item: Pick<DocItem, "ref" | "car">, capital = false) => {
  const word = shortName[item.ref.kind];
  const s = item.car ? `${word === "RC" ? "the RC" : word} of ${item.car.number || item.car.model}` : word === "Aadhaar" ? "Aadhaar card" : word;
  return capital ? s.charAt(0).toUpperCase() + s.slice(1) : s;
};

export const toCheck = (v: Vendor) => allDocs(v).filter((i) => i.doc.status === "review" && i.doc.file);
// Required documents that are not there (PAN is optional).
export const missingDocs = (v: Vendor) =>
  allDocs(v).filter((i) => (i.car || REQUIRED_PERSON_DOCS.includes(i.ref.kind as never)) && docBadge(i.doc, istToday()) === "missing");
export const awaitingReupload = (v: Vendor) => allDocs(v).filter((i) => i.doc.status === "reupload");

// Person documents that must be in before staff can approve.
export const approvalBlocked = (v: Vendor) =>
  REQUIRED_PERSON_DOCS.some((k) => {
    const d = findDoc(v.docs, k);
    return !d?.file || d.status === "missing" || d.status === "reupload";
  });

export function joinWords(words: string[]) {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

// Detail line under a document title.
export function docDetail(item: DocItem, v: Vendor, today: string): string {
  const d = item.doc;
  const badge = docBadge(d, today);
  if (d.status === "reupload") return [d.askedAt ? `Asked again ${dayTime(d.askedAt)}` : "Asked again", d.reason?.toLowerCase()].filter(Boolean).join(" · ");
  if (badge === "missing") {
    if (item.car) return "Needed before the car can take trips";
    if (item.ref.kind === "pan") return "Optional";
    return "Needed before approval";
  }
  const num = item.ref.kind === "aadhaar" ? maskAadhaar(d.number) : item.ref.kind === "pan" ? maskPan(d.number) : d.number;
  const left = daysLeft(d.validTill, today);
  if (badge === "expiring" && d.validTill) return `Valid till ${fullDate(d.validTill, true)} · ${left} day${left === 1 ? "" : "s"} left`;
  if (badge === "expired" && d.validTill) return `Expired ${fullDate(d.validTill, true)}`;
  const parts = [num, d.note];
  if (d.validTill) parts.push(`${parts.some(Boolean) ? "valid" : "Valid"} till ${fullDate(d.validTill, true)}`);
  else if (d.uploadedAt) parts.push(`${parts.some(Boolean) ? "uploaded" : "Uploaded"} ${dayMonth(d.uploadedAt)}`);
  if (item.ref.kind === "rc" && !num) parts.push(`owner ${v.name}`);
  return parts.filter(Boolean).join(" · ") || d.fileName || "Uploaded";
}

// One-line summary of a car's documents on the vehicle card.
export function carDocLine(car: VendorCar, v: Vendor, today: string): string {
  if (v.status === "suspended") return "Off trips while the vendor is suspended";
  const groups: Record<string, string[]> = {};
  for (const k of CAR_DOCS) {
    const b = docBadge(findDoc(car.docs, k), today);
    const key = b === "expiring" ? "verified" : b;
    (groups[key] ??= []).push(shortName[k]);
  }
  const verified = groups.verified ?? [];
  if (verified.length === CAR_DOCS.length) return v.status === "approved" ? "All documents verified · on trips" : "All documents verified";
  const cap = (s: string) => (s === "RC" || s === "PUC" ? s : s.charAt(0).toUpperCase() + s.slice(1));
  const parts: string[] = [];
  const add = (key: string, word: string) => {
    const list = groups[key];
    if (list?.length) parts.push(`${cap(joinWords(list))} ${word}`);
  };
  add("missing", "missing");
  add("expired", "expired");
  add("review", list(groups.review) > 1 ? "need review" : "needs review");
  if (v.status === "approved") return `${parts[0]} · off trips until uploaded`;
  if (verified.length) parts.push(`${parts.length ? verified.join(", ") : cap(verified.join(", "))} verified`);
  return parts.join(" · ");
}
const list = (a?: string[]) => a?.length ?? 0;
