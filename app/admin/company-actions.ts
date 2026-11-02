"use server";

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";
import { getCompany, saveCompany } from "@/lib/company";
import { DATA_DIR } from "@/lib/db";
import { fieldErrors, fromDraft, type CompanyDraft, type DraftKey } from "@/components/admin/company/profileFields";

const LOGO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_LOGO = 2 * 1024 * 1024;
const validLogo = (src: string) => src === "" || /^\/uploads\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(src);

const STRING_KEYS: DraftKey[] = [
  "name", "shortName", "tagline", "logo", "logoName", "logoKb", "phone", "whatsapp", "email", "website", "addressLine", "pin",
  "town", "district", "state", "hours", "gstin", "pan", "upi", "bankAccount", "terms", "signoff",
];
const BOOL_KEYS: DraftKey[] = ["whatsappSame", "open24", "showGstin", "upiQr"];

// Company profile → Save changes (Figma 8.1–8.4). Re-runs the form's checks
// on the server; on success every new booking PDF and message uses the details.
export async function saveCompanyProfile(
  input: CompanyDraft,
): Promise<{ ok?: boolean; error?: string; errors?: Partial<Record<DraftKey, string>>; updatedAt?: string; updatedBy?: string }> {
  const session = await requireAdmin();

  // Never trust the shape coming from the browser.
  const draft = {} as Record<DraftKey, string | boolean>;
  for (const k of STRING_KEYS) {
    const v = (input as Record<string, unknown>)?.[k];
    draft[k] = typeof v === "string" ? v.slice(0, k === "terms" ? 2000 : 200) : "";
  }
  for (const k of BOOL_KEYS) draft[k] = (input as Record<string, unknown>)?.[k] === true;
  const d = draft as CompanyDraft;

  if (!validLogo(d.logo)) return { error: "The logo must be an uploaded image." };
  const errors = fieldErrors(d);
  if (Object.keys(errors).length) return { errors };

  const next = { ...fromDraft(d, await getCompany()), updatedBy: session.email };
  await saveCompany(next);
  revalidatePath("/admin", "layout");
  const saved = await getCompany();
  return { ok: true, updatedAt: saved.updatedAt, updatedBy: saved.updatedBy };
}

// Logo upload from the Brand card. Saved under data/uploads and served by
// app/uploads/[file] (same as car photos).
export async function uploadCompanyLogo(formData: FormData): Promise<{ url?: string; name?: string; kb?: number; error?: string }> {
  await requireAdmin();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a logo first." };
  const ext = LOGO_TYPES[file.type];
  if (!ext) return { error: "Use a PNG, JPG or WebP logo." };
  if (file.size > MAX_LOGO) return { error: "That logo is over 2 MB — please use a smaller one." };

  const bytes = Buffer.from(await file.arrayBuffer());
  const magic = bytes.subarray(0, 12).toString("hex");
  const real =
    (ext === "jpg" && magic.startsWith("ffd8ff")) ||
    (ext === "png" && magic.startsWith("89504e47")) ||
    (ext === "webp" && magic.startsWith("52494646") && magic.slice(16, 24) === "57454250");
  if (!real) return { error: "That file doesn't look like a valid image." };

  const name = `${randomUUID()}.${ext}`;
  await fs.mkdir(path.join(DATA_DIR, "uploads"), { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, "uploads", name), bytes);
  return { url: `/uploads/${name}`, name: file.name.slice(0, 80), kb: Math.max(1, Math.round(file.size / 1024)) };
}
