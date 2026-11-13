import { jsonFile } from "./db";
import type { Fares } from "./catalogTypes";
import { routes as siteRoutes, seedFares } from "./site";

// Fares store (data/fares.json). Until staff publish a change, fares are the
// seed values in lib/site.ts.
//
// On top of the public `Fares` shape the admin keeps three lists of its own
// (Figma Flow 5 · 5.7–5.14): routes staff added that have no page in
// lib/site.ts, site routes they took off, and the "Extras and rules" table as
// item/value rows. `routes` and `rules` stay filled in for the public site.

export type FareExtra = { id: string; label: string; value: string };
export type CustomRoute = { slug: string; from: string; to: string; km: number };

// One row of the admin "Route starting fares" table.
export type RouteFare = {
  slug: string;
  from: string;
  to: string;
  distance: string; // "120 km · ≈ 3 hr"
  price: number;
  custom: boolean; // added in the admin (no page in lib/site.ts)
};

type Stored = Fares & { extras?: FareExtra[]; customRoutes?: CustomRoute[]; removedRoutes?: string[] };

export type FaresDoc = {
  fares: Fares; // what the public site reads (getFares)
  extras: FareExtra[];
  routes: RouteFare[];
  customRoutes: CustomRoute[];
  removedRoutes: string[];
};

const db = jsonFile<Stored | null>("fares.json", () => null);

// Fare notes saved before the item/value table: "Item: value" splits in two,
// anything else becomes an item with no value.
const extrasFromRules = (rules: string[]): FareExtra[] =>
  rules.map((r, i) => {
    const at = r.lastIndexOf(": ");
    const split = at > 0 && r.length - at <= 40;
    return { id: `rule-${i + 1}`, label: split ? r.slice(0, at) : r, value: split ? r.slice(at + 2) : "" };
  });

// "Tolls, parking, state taxes: At actuals" — the line the public fare notes print.
export const extraLine = (e: Pick<FareExtra, "label" | "value">) => (e.value ? `${e.label}: ${e.value}` : e.label);

async function load(): Promise<FaresDoc> {
  const saved = await db.read();
  const removed = saved?.removedRoutes ?? [];
  const custom = saved?.customRoutes ?? [];
  const extras = saved?.extras ?? extrasFromRules(saved?.rules ?? seedFares.rules);

  // Saved fares, filled in from the seed for anything the saved copy lacks
  // (e.g. a route added to lib/site.ts after the last publish).
  const routes: RouteFare[] = [];
  for (const r of siteRoutes) {
    if (removed.includes(r.slug)) continue;
    const price = saved?.routes?.[r.slug] ?? seedFares.routes[r.slug] ?? 0;
    routes.push({ slug: r.slug, from: r.from, to: r.to, distance: `${r.distance} · ${r.duration}`, price, custom: false });
  }
  for (const c of custom) {
    if (routes.some((r) => r.slug === c.slug)) continue;
    routes.push({ slug: c.slug, from: c.from, to: c.to, distance: `${c.km} km`, price: saved?.routes?.[c.slug] ?? 0, custom: true });
  }

  const fares: Fares = {
    perKm: saved?.perKm ?? structuredClone(seedFares.perKm),
    hourly: saved?.hourly ?? structuredClone(seedFares.hourly),
    routes: Object.fromEntries(routes.map((r) => [r.slug, r.price])),
    nightAllowance: saved?.nightAllowance ?? seedFares.nightAllowance,
    rules: extras.map(extraLine),
    updatedAt: saved?.updatedAt,
  };
  return { fares, extras, routes, customRoutes: custom, removedRoutes: removed };
}

export async function getFares(): Promise<Fares> {
  return (await load()).fares;
}

// Everything the admin Fares page edits.
export async function getFaresDoc(): Promise<FaresDoc> {
  return load();
}

export async function saveFares(
  next: Omit<Fares, "rules" | "updatedAt">,
  extra: { extras: FareExtra[]; customRoutes: CustomRoute[]; removedRoutes: string[] },
): Promise<Fares> {
  const stored: Stored = {
    ...next,
    rules: extra.extras.map(extraLine),
    extras: extra.extras,
    customRoutes: extra.customRoutes,
    removedRoutes: extra.removedRoutes,
    updatedAt: new Date().toISOString(),
  };
  await db.replace(stored);
  return stored;
}
