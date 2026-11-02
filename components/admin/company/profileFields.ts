import type { Company } from "@/lib/company";

// Browser-safe helpers for the Company profile form (Figma Flow 8), shared by
// the client form and the save action: the flat draft the form edits, the
// checks run on Save, and the "Profile complete" sections.

export type CompanyDraft = {
  name: string;
  shortName: string;
  tagline: string;
  logo: string;
  logoName: string;
  logoKb: string;
  phone: string; // "+91 94311 00700"
  whatsapp: string;
  whatsappSame: boolean;
  email: string;
  website: string;
  addressLine: string;
  pin: string;
  town: string;
  district: string;
  state: string;
  open24: boolean;
  hours: string;
  gstin: string;
  pan: string;
  showGstin: boolean;
  upi: string;
  bankAccount: string;
  upiQr: boolean;
  terms: string; // one term per line
  signoff: string;
};

export type DraftKey = keyof CompanyDraft;

// Labels used in the unsaved bar ("Tagline, phone.") and error messages.
export const FIELD_LABELS: Record<DraftKey, string> = {
  name: "Business name",
  shortName: "Short name",
  tagline: "Tagline",
  logo: "Logo",
  logoName: "Logo",
  logoKb: "Logo",
  phone: "Phone",
  whatsapp: "WhatsApp",
  whatsappSame: "WhatsApp",
  email: "Email",
  website: "Website",
  addressLine: "Address",
  pin: "PIN code",
  town: "Town",
  district: "District",
  state: "State",
  open24: "Opening hours",
  hours: "Opening hours",
  gstin: "GSTIN",
  pan: "PAN",
  showGstin: "GSTIN on PDFs",
  upi: "UPI ID",
  bankAccount: "Bank account",
  upiQr: "UPI QR",
  terms: "Terms",
  signoff: "WhatsApp sign-off",
};

const digits = (s: string) => s.replace(/\D/g, "");
// Last 10 digits of an Indian mobile ("+91 94311 00700" → "9431100700").
export const mobile10 = (s: string) => {
  const d = digits(s);
  return d.length >= 10 ? d.slice(-10) : d;
};
export const showMobile = (s: string) => {
  const d = mobile10(s);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : s.trim();
};

export function toDraft(c: Company): CompanyDraft {
  return {
    name: c.name,
    shortName: c.shortName ?? "",
    tagline: c.tagline,
    logo: c.logo ?? "",
    logoName: c.logoName ?? "",
    logoKb: c.logoKb != null ? String(c.logoKb) : "",
    phone: showMobile(c.phone),
    whatsapp: showMobile(c.whatsapp),
    whatsappSame: c.whatsappSame ?? mobile10(c.phone) === mobile10(c.whatsapp),
    email: c.email,
    website: c.website,
    addressLine: c.address.line,
    pin: c.address.pin,
    town: c.address.town,
    district: c.address.district,
    state: c.address.state,
    open24: c.open24 ?? true,
    hours: c.open24 === false ? (c.hours ?? "") : "",
    gstin: c.gstin ?? "",
    pan: c.pan ?? "",
    showGstin: c.showGstin ?? true,
    upi: c.upi ?? "",
    bankAccount: c.bankAccount ?? "",
    upiQr: c.upiQr ?? false,
    terms: c.terms.join("\n"),
    signoff: c.whatsappSignoff ?? "",
  };
}

// Draft → stored profile. Keeps fields this screen doesn't edit (legal name,
// extra phone numbers, bank object…).
export function fromDraft(d: CompanyDraft, base: Company): Company {
  const phone = mobile10(d.phone);
  const wa = mobile10(d.whatsappSame ? d.phone : d.whatsapp);
  const kb = Number(d.logoKb);
  return {
    ...base,
    name: d.name.trim(),
    shortName: d.shortName.trim() || undefined,
    tagline: d.tagline.trim(),
    logo: d.logo || undefined,
    logoName: d.logo ? d.logoName || undefined : undefined,
    logoKb: d.logo && Number.isFinite(kb) && kb > 0 ? kb : undefined,
    phone: `+91${phone}`,
    phoneDisplay: `${phone.slice(0, 5)} ${phone.slice(5)}`,
    whatsapp: `91${wa}`,
    whatsappSame: d.whatsappSame,
    email: d.email.trim(),
    website: d.website.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""),
    address: {
      line: d.addressLine.trim(),
      town: d.town.trim(),
      district: d.district.trim(),
      state: d.state.trim(),
      pin: digits(d.pin),
    },
    open24: d.open24,
    hours: d.open24 ? "Open 24 hours, all days" : d.hours.trim(),
    gstin: d.gstin.trim().toUpperCase() || undefined,
    pan: d.pan.trim().toUpperCase() || undefined,
    showGstin: d.showGstin,
    upi: d.upi.trim() || undefined,
    bankAccount: d.bankAccount.trim() || undefined,
    upiQr: d.upiQr,
    terms: d.terms
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12),
    whatsappSignoff: d.signoff.trim() || undefined,
  };
}

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPI_RE = /^[\w.-]{2,}@[a-zA-Z]{2,}$/;

// Field problems that block Save (Figma 8.3). Empty optional fields are fine.
export function fieldErrors(d: CompanyDraft): Partial<Record<DraftKey, string>> {
  const e: Partial<Record<DraftKey, string>> = {};
  if (!d.name.trim()) e.name = "Add the business name customers know you by.";
  if (mobile10(d.phone).length !== 10) e.phone = "Enter a 10-digit mobile number, like +91 94311 00700";
  if (!d.whatsappSame && mobile10(d.whatsapp).length !== 10) e.whatsapp = "Enter a 10-digit WhatsApp number";
  if (d.email.trim() && !EMAIL_RE.test(d.email.trim())) e.email = "Check the email, like hello@dumraoncab.com";
  if (d.pin.trim() && !/^\d{6}$/.test(digits(d.pin))) e.pin = "PIN code has 6 digits";
  if (!d.open24 && !d.hours.trim()) e.hours = "Add your opening hours, or turn on 24 hours";
  const g = d.gstin.trim().toUpperCase();
  if (g && g.length !== 15) e.gstin = "GSTIN has 15 characters, like 10ABCDE1234F1Z5";
  else if (g && !GSTIN_RE.test(g)) e.gstin = "Check the GSTIN against your GST certificate";
  const p = d.pan.trim().toUpperCase();
  if (p && !PAN_RE.test(p)) e.pan = "PAN has 10 characters, like ABCDE1234F";
  if (d.upi.trim() && !UPI_RE.test(d.upi.trim())) e.upi = "UPI ID looks like name@bank";
  return e;
}

// "Profile complete" card: six sections, each done when its key details are
// filled in and valid. `problem` is the short note shown when it isn't.
export type Section = { key: string; label: string; done: boolean; problem?: string; fields: DraftKey[] };

export function sections(d: CompanyDraft): Section[] {
  const err = fieldErrors(d);
  const first = (pairs: [boolean, string][]) => pairs.find(([bad]) => bad)?.[1];
  const g = d.gstin.trim();
  const list: Omit<Section, "done">[] = [
    { key: "brand", label: "Brand", fields: ["name", "shortName", "tagline", "logo"], problem: first([[!!err.name, "business name missing"], [!d.tagline.trim(), "tagline missing"]]) },
    {
      key: "contact",
      label: "Contact",
      fields: ["phone", "whatsapp", "email", "website"],
      problem: first([[!!err.phone, "phone number needed"], [!!err.whatsapp, "WhatsApp number needed"], [!!err.email, "email looks wrong"]]),
    },
    {
      key: "office",
      label: "Office",
      fields: ["addressLine", "pin", "town", "district", "state", "hours"],
      problem: first([[!d.addressLine.trim(), "address missing"], [!d.town.trim(), "town missing"], [!d.pin.trim() || !!err.pin, "PIN code needed"], [!!err.hours, "opening hours missing"]]),
    },
    {
      key: "tax",
      label: "Tax and registration",
      fields: ["gstin", "pan"],
      problem: first([[!g, "GSTIN missing"], [g.length > 0 && g.length < 15, "GSTIN is short"], [!!err.gstin, "GSTIN looks wrong"], [!!err.pan, "PAN looks wrong"]]),
    },
    { key: "payments", label: "Payments", fields: ["upi", "bankAccount"], problem: first([[!d.upi.trim(), "UPI ID missing"], [!!err.upi, "UPI ID looks wrong"]]) },
    { key: "pdfs", label: "PDFs and messages", fields: ["terms", "signoff"], problem: first([[!d.terms.trim(), "terms missing"], [!d.signoff.trim(), "sign-off missing"]]) },
  ];
  return list.map((s) => ({ ...s, done: !s.problem }));
}

// Bihar districts (the cab stand's home state) for the District select.
export const BIHAR_DISTRICTS = [
  "Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran",
  "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura",
  "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur",
  "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran",
];

export const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];
