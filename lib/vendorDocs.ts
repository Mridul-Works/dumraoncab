import { randomUUID } from "crypto";
import { putUpload, removeUpload } from "./db";

// Server-only (uses Node fs). Vendor documents (Aadhaar, licence, RC …) are
// private: they're saved under data/vendor-docs/ and served ONLY to signed-in
// staff by app/admin/vendor-docs/[file]/route.ts — never from /uploads.
// Shared by the admin Vendors section and the driver app's sign-up.

export const MAX_VENDOR_DOC = 5 * 1024 * 1024; // 5 MB

export const VENDOR_DOC_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export const VENDOR_DOC_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

// Stored names are "<uuid>.<ext>".
export const VENDOR_DOC_NAME = /^[a-f0-9-]{36}\.(jpg|png|webp|pdf)$/;

// URL staff open to view a stored document.
export const vendorDocUrl = (file: string) => `/admin/vendor-docs/${file}`;

export type SavedVendorDoc = { file: string; fileName: string; sizeKb: number; uploadedAt: string };

// Checks magic bytes so a renamed file can't pass as an image/PDF.
function sniff(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (bytes.length >= 5 && bytes.toString("ascii", 0, 5) === "%PDF-") return "pdf";
  return null;
}

// Validates and stores one uploaded document. Returns the stored record, or
// { error } with a message fit to show the user.
export async function saveVendorDoc(file: File): Promise<SavedVendorDoc | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file first." };
  if (file.size > MAX_VENDOR_DOC) return { error: "That file is over 5 MB. Upload a smaller photo or PDF." };
  const declared = VENDOR_DOC_TYPES[file.type];
  if (!declared) return { error: "Use a JPG, PNG, WebP or PDF file." };
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = sniff(bytes);
  if (!ext) return { error: "That file doesn't look like a photo or PDF." };

  const name = `${randomUUID()}.${ext}`;
  await putUpload("vendor-docs", name, bytes);
  return {
    file: name,
    fileName: (file.name || `document.${ext}`).slice(0, 120),
    sizeKb: Math.max(1, Math.round(file.size / 1024)),
    uploadedAt: new Date().toISOString(),
  };
}

export async function removeVendorDoc(file: string | undefined) {
  if (!file || !VENDOR_DOC_NAME.test(file)) return;
  await removeUpload("vendor-docs", file);
}
