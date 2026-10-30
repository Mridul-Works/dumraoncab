"use server";

import { requireAdmin } from "@/lib/adminAuth";
import type { Fares } from "@/lib/catalogTypes";
import { getFares, saveFares } from "@/lib/fares";
import { publishSite } from "./form";

const MAX_PRICE = 1_000_000;
const price = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_PRICE ? v : null);

// Fares edit mode → "Save and publish". Only prices and rules change here; the
// list of classes, packages and routes stays as defined in lib/site.ts.
export async function publishFares(next: Fares): Promise<{ ok?: boolean; error?: string; updatedAt?: string }> {
  await requireAdmin();
  const current = await getFares();

  const perKm = current.perKm.map((c) => ({ ...c, rate: price(next.perKm?.find((n) => n.id === c.id)?.rate) }));
  const hourly = current.hourly.map((p) => ({ ...p, price: price(next.hourly?.find((n) => n.id === p.id)?.price) }));
  const routes = Object.fromEntries(Object.keys(current.routes).map((slug) => [slug, price(next.routes?.[slug])]));
  const nightAllowance = price(next.nightAllowance);

  if (perKm.some((c) => c.rate === null || c.rate === 0)) return { error: "Every per-km rate needs a price above ₹0." };
  if (hourly.some((p) => p.price === null || p.price === 0)) return { error: "Every hourly package needs a price above ₹0." };
  if (Object.values(routes).some((v) => v === null || v === 0)) return { error: "Every route needs a fare above ₹0." };
  if (nightAllowance === null) return { error: "Night allowance must be a whole number of rupees." };

  const rules = (Array.isArray(next.rules) ? next.rules : [])
    .filter((r): r is string => typeof r === "string")
    .map((r) => r.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 12);

  const saved = await saveFares({
    perKm: perKm as Fares["perKm"],
    hourly: hourly as Fares["hourly"],
    routes: routes as Fares["routes"],
    nightAllowance,
    rules,
  });
  publishSite();
  return { ok: true, updatedAt: saved.updatedAt };
}
