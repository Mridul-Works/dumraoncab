// Browser-safe vendor types (no Node imports). A vendor is a car owner or a
// driver who runs trips for Dumraon Cab. Vendors sign up in the driver app
// (/driver) or are added by staff (/admin/vendors/new); staff check their
// documents and approve, reject or suspend them (Figma Flow 6 + Flow 10).

export type VendorKind = "owner" | "driver";

// pending → approved → (suspended ↔ approved); pending → rejected.
export type VendorStatus = "pending" | "approved" | "suspended" | "rejected";

// Per-document review state shown as a badge (Needs review / Verified /
// Expires soon / Missing) and set by staff in the document review drawer.
export type DocStatus = "missing" | "review" | "verified" | "reupload";

export type PersonDocKind = "photo" | "aadhaar" | "licence" | "pan";
export type CarDocKind = "rc" | "insurance" | "permit" | "puc";

export type VendorDoc = {
  kind: PersonDocKind | CarDocKind;
  status: DocStatus;
  file?: string; // stored upload name in data/vendor-docs, served to staff by /admin/vendor-docs/[file]
  fileName?: string; // original file name, e.g. "rohit.jpg"
  sizeKb?: number;
  number?: string; // e.g. licence or Aadhaar number (masked when shown)
  validTill?: string; // YYYY-MM-DD
  note?: string; // detail line, e.g. "ICICI Lombard" or "All-India tourist permit"
  reason?: string; // why staff asked for a re-upload
  uploadedAt?: string; // ISO
  // Added by the admin Vendors section (all optional):
  fileBack?: string; // second side (Aadhaar back), same store as `file`
  fileBackName?: string;
  staffNote?: string; // "Note for the team" in the review drawer — staff only
  askedAt?: string; // ISO — when staff asked for a re-upload
  reviewedAt?: string; // ISO — when staff marked it verified
};

export type VendorCar = {
  id: string;
  model: string; // "Mahindra Scorpio N"
  number: string; // "BR 44 AB 1234"
  type: string; // SUV / MUV / Sedan / Hatchback …
  fuel: string; // Diesel / Petrol / CNG / EV
  seats: number;
  year: number;
  docs: VendorDoc[]; // rc, insurance, permit, puc
};

export type WorkPlace = { name: string; km?: number; home?: boolean; onRequest?: boolean };

export type VendorEvent = { at: string; text: string; by?: "staff" | "vendor" };

export type Vendor = {
  id: string;
  createdAt: string; // ISO
  updatedAt?: string;
  source: "driver-app" | "admin";
  kind: VendorKind;
  status: VendorStatus;
  name: string;
  mobile: string; // login for the driver app, "+91 79922 95575"
  altMobile?: string;
  email?: string;
  whatsapp?: boolean;
  address?: { line: string; town: string; district: string; state: string; pin: string; lat?: number; lng?: number };
  radiusKm?: number | null; // null = any distance
  places: WorkPlace[];
  docs: VendorDoc[]; // person documents: photo, aadhaar, licence, pan
  cars: VendorCar[];
  upi?: string;
  pan?: string;
  rating?: number;
  trips?: number;
  earned?: number; // ₹
  statusReason?: string; // reason for reject / suspend
  history?: VendorEvent[];
  // Added by the admin Vendors section (all optional):
  code?: string; // "VN-0013", given when the vendor is created
  statusAt?: string; // ISO — when the current status was set
  statusBy?: string; // staff email
  statusMessage?: string; // message sent to the vendor with a reject / suspend
  suspendedUntil?: string | null; // YYYY-MM-DD; null = until staff reactivate
  approvedAt?: string; // ISO — first approval
  // Lets staff undo the last approve / reject / suspend from the toast.
  lastChange?: {
    status: VendorStatus;
    statusReason?: string;
    statusMessage?: string;
    statusAt?: string;
    statusBy?: string;
    suspendedUntil?: string | null;
    moved?: { bookingId: string; vendorId?: string; vendorCarId?: string; driverName?: string; driverMobile?: string }[];
  };
};

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  suspended: "Suspended",
  rejected: "Rejected",
};

export const VENDOR_KIND_LABELS: Record<VendorKind, string> = { owner: "Owner", driver: "Driver" };

export const DOC_LABELS: Record<VendorDoc["kind"], string> = {
  photo: "Profile photo",
  aadhaar: "Aadhaar card",
  licence: "Driving licence",
  pan: "PAN card",
  rc: "RC (registration)",
  insurance: "Insurance",
  permit: "Permit",
  puc: "PUC (pollution)",
};

export const PERSON_DOCS: PersonDocKind[] = ["photo", "aadhaar", "licence", "pan"];
export const CAR_DOCS: CarDocKind[] = ["rc", "insurance", "permit", "puc"];
// PAN is optional; every other document must be verified before approval.
export const OPTIONAL_DOCS: VendorDoc["kind"][] = ["pan"];

// ---- Helpers (browser-safe) -------------------------------------------------

// Person documents a vendor must have before approval (PAN is optional).
export const REQUIRED_PERSON_DOCS: PersonDocKind[] = ["photo", "aadhaar", "licence"];

const DAY = 24 * 60 * 60 * 1000;

// Days until a YYYY-MM-DD date (negative once it has passed), or null.
export function daysLeft(validTill: string | undefined, today: string): number | null {
  if (!validTill || !/^\d{4}-\d{2}-\d{2}$/.test(validTill)) return null;
  return Math.round((Date.parse(`${validTill}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY);
}

// What the badge on a document row says.
export type DocBadge = "verified" | "review" | "expiring" | "expired" | "missing";

export function docBadge(d: VendorDoc | undefined, today: string): DocBadge {
  if (!d || d.status === "missing" || d.status === "reupload" || !d.file) return "missing";
  if (d.status === "review") return "review";
  const left = daysLeft(d.validTill, today);
  if (left !== null && left < 0) return "expired";
  if (left !== null && left <= 30) return "expiring";
  return "verified";
}

export const findDoc = (docs: VendorDoc[], kind: VendorDoc["kind"]) => docs.find((d) => d.kind === kind);

// A car can take trips once its RC, insurance, permit and PUC are all verified
// and in date. Used by the bookings "Assign car and driver" drawer.
export function carReady(car: VendorCar, today: string): boolean {
  return CAR_DOCS.every((k) => {
    const b = docBadge(findDoc(car.docs, k), today);
    return b === "verified" || b === "expiring";
  });
}

// An approved vendor whose car is ready can be assigned to a booking.
export const canTakeTrips = (v: Vendor, car: VendorCar, today: string) => v.status === "approved" && carReady(car, today);
