import { jsonFile } from "./db";
import type { Fares } from "./catalogTypes";
import { routes, seedFares } from "./site";

// Fares store (data/fares.json). Until staff publish a change, fares are the
// seed values in lib/site.ts.

const db = jsonFile<Fares | null>("fares.json", () => null);

// Saved fares, filled in from the seed for anything the saved copy lacks
// (e.g. a route added to lib/site.ts after the last publish).
export async function getFares(): Promise<Fares> {
  const saved = await db.read();
  if (!saved) return structuredClone(seedFares);
  const routeFares: Record<string, number> = {};
  for (const r of routes) routeFares[r.slug] = saved.routes?.[r.slug] ?? seedFares.routes[r.slug] ?? 0;
  return {
    perKm: saved.perKm?.length ? saved.perKm : seedFares.perKm,
    hourly: saved.hourly?.length ? saved.hourly : seedFares.hourly,
    routes: routeFares,
    nightAllowance: saved.nightAllowance ?? seedFares.nightAllowance,
    rules: saved.rules ?? seedFares.rules,
    updatedAt: saved.updatedAt,
  };
}

export async function saveFares(next: Fares): Promise<Fares> {
  const fares = { ...next, updatedAt: new Date().toISOString() };
  await db.replace(fares);
  return fares;
}
