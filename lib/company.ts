import { jsonFile } from "./db";
import { site } from "./site";

// Company profile (data/company.json — Figma Flow 8). Business details used on
// booking PDFs, WhatsApp messages and the website. Falls back to the seed
// values in lib/site.ts until staff save the profile once.
// The Company profile screens may add fields here; keep them optional.

export type Company = {
  name: string;
  legalName: string;
  tagline: string;
  logo?: string; // /uploads/… image
  phone: string; // "+919525802341"
  phoneDisplay: string; // "95258 02341"
  altPhones: { raw: string; display: string }[];
  whatsapp: string; // "919525802341"
  email: string;
  website: string;
  address: { line: string; town: string; district: string; state: string; pin: string };
  gstin?: string;
  pan?: string;
  upi?: string;
  bank?: { name: string; account: string; ifsc: string };
  hours?: string; // "Open 24 hours, all days"
  terms: string[]; // printed on booking PDFs
  updatedAt?: string;
  // Added by the Company profile screen (Figma 8.1–8.4):
  shortName?: string; // "Dumraon Cab" — sign-offs and the logo mark
  logoName?: string; // original file name of the uploaded logo
  logoKb?: number;
  whatsappSame?: boolean; // "WhatsApp is the same as phone"
  open24?: boolean; // "Open 24 hours, every day"
  showGstin?: boolean; // print the GSTIN on booking PDFs
  upiQr?: boolean; // add a UPI QR to booking PDFs
  bankAccount?: string; // one-line bank account, e.g. "SBI Dumraon · XXXX 4471"
  whatsappSignoff?: string; // last line of every WhatsApp message
  updatedBy?: string; // staff email of the last save
};

export function seedCompany(): Company {
  return {
    name: site.name,
    legalName: site.legalName,
    tagline: site.tagline,
    phone: site.phone,
    phoneDisplay: site.phoneDisplay,
    altPhones: site.altPhones,
    whatsapp: site.whatsapp,
    email: site.email,
    website: site.url.replace(/^https?:\/\//, ""),
    address: { line: "", town: site.address.locality, district: site.address.district, state: site.address.region, pin: site.address.postalCode },
    hours: "Open 24 hours, all days",
    terms: [
      "Tolls, parking and state taxes are paid at actuals.",
      "Night driving allowance applies between 10 pm and 6 am.",
      "Please share any change in pickup time at least 2 hours before.",
    ],
    shortName: "Dumraon Cab",
    whatsappSame: site.whatsapp === site.phone.replace(/^\+/, ""),
    open24: true,
    showGstin: true,
    upiQr: false,
    whatsappSignoff: `Team Dumraon Cab · +91 ${site.phoneDisplay}`,
  };
}

const db = jsonFile<Company>("company.json", seedCompany);

export async function getCompany(): Promise<Company> {
  return { ...seedCompany(), ...(await db.read()) };
}

export async function saveCompany(next: Company): Promise<void> {
  await db.replace({ ...next, updatedAt: new Date().toISOString() });
}
