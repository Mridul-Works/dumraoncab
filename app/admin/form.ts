import { revalidatePath, updateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";

// Shared helpers for admin Server Actions (not an action module itself).

export type FormState = { error?: string; ok?: boolean; email?: string } | undefined;

export const field = (fd: FormData, key: string, max = 200) => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
};

// Whole, non-negative number from a form field ("1,299" and "₹1299" accepted); 0 when blank.
export const money = (fd: FormData, key: string, max = 10_000_000) => {
  const n = Number(field(fd, key, 20).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 0), max) : 0;
};

export const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

// Admin pages only (bookings, journal).
export const refreshAdmin = () => revalidatePath("/admin", "layout");

// Fleet or fares changed: expire every public page built from the catalog
// (home, fleet, booking, routes, about) so the next visitor gets fresh prices,
// never a stale copy, and refresh the admin. Deliberately not
// revalidatePath("/", "layout"): that also expires pages it doesn't need to.
export const publishSite = () => {
  updateTag(CATALOG_TAG);
  refreshAdmin();
};
