"use server";

import { requireAdmin } from "@/lib/adminAuth";
import type { Fares } from "@/lib/catalogTypes";
import { getFaresDoc, saveFares, type CustomRoute, type FareExtra } from "@/lib/fares";
import { listCars, updateCar } from "@/lib/fleet";
import { routes as siteRoutes } from "@/lib/site";
import { publishSite } from "./form";

// Fares edit mode → "Save and publish" (Figma Flow 5). Prices of existing rows
// change; rows can be added (5.7, 5.13) and removed (5.9). Rows without an id
// are new. The client checks the same rules first; this is the guard.

export type FaresInput = {
  base?: string; // updatedAt the editor loaded; another publish since → conflict (5.6)
  force?: boolean; // "Publish mine over it"
  perKm: { id?: string; name: string; rate: number; cars?: string[] }[];
  hourly: { id?: string; name: string; for: string; price: number }[];
  routes: { slug?: string; from: string; to: string; km: number; price: number }[];
  nightAllowance: number;
  extras: { id?: string; label: string; value: string }[];
};

export type FaresResult = { ok?: boolean; updatedAt?: string; error?: string; conflict?: string };

const MAX_PRICE = 1_000_000;
const price = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v > 0 && v <= MAX_PRICE ? v : null);
const text = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = <T>(v: unknown, max: number): T[] => (Array.isArray(v) ? (v.slice(0, max) as T[]) : []);
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const slugify = (s: string, fallback: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || fallback;
const unique = (base: string, taken: Set<string>) => {
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  taken.add(id);
  return id;
};

export async function publishFares(input: FaresInput): Promise<FaresResult> {
  const session = await requireAdmin();
  const doc = await getFaresDoc();
  const current = doc.fares;

  if (!input.force && (input.base ?? "") !== (current.updatedAt ?? "")) return { conflict: current.updatedAt ?? "" };

  const cars = await listCars();

  // ---- Per-km classes ----
  const classIds = new Set(current.perKm.map((c) => c.id));
  const perKm: Fares["perKm"] = [];
  const moves: { car: string; cls: string }[] = [];
  for (const row of list<FaresInput["perKm"][number]>(input.perKm, 20)) {
    const rate = price(row.rate);
    const old = row.id ? current.perKm.find((c) => c.id === row.id) : undefined;
    if (row.id && !old) continue;
    const name = old ? old.name : text(row.name, 40);
    if (!name) return { error: "Every car class needs a name." };
    if (rate === null) return { error: `${name} needs a rate above ₹0.` };
    if (perKm.some((c) => norm(c.name) === norm(name))) return { error: `${name} is already a car class.` };
    const id = old ? old.id : unique(slugify(name, "class"), classIds);
    perKm.push({ id, name, rate });
    if (!old) for (const car of list<string>(row.cars, 50)) if (cars.some((c) => c.id === car)) moves.push({ car, cls: id });
  }
  // A class still used by cars in Fleet can't go (5.12) — unless those cars move to a new class now.
  for (const c of current.perKm) {
    if (perKm.some((k) => k.id === c.id)) continue;
    const stuck = cars.filter((car) => car.fareClass === c.id && !moves.some((m) => m.car === car.id));
    if (stuck.length) return { error: `${c.name} is used by cars in Fleet. Move them to another class first.` };
  }

  // ---- Hourly packages ----
  const pkgIds = new Set(current.hourly.map((p) => p.id));
  const hourly: Fares["hourly"] = [];
  for (const row of list<FaresInput["hourly"][number]>(input.hourly, 20)) {
    const old = row.id ? current.hourly.find((p) => p.id === row.id) : undefined;
    if (row.id && !old) continue;
    const name = old ? old.name : text(row.name, 40);
    const usedFor = old ? old.for : text(row.for, 80);
    const p = price(row.price);
    if (!name || !usedFor) return { error: "Every package needs a name and what it is good for." };
    if (p === null) return { error: `${name} needs a price above ₹0.` };
    hourly.push({ id: old ? old.id : unique(slugify(name, "package"), pkgIds), name, for: usedFor, price: p });
  }

  // ---- Routes ----
  const known = new Map(doc.routes.map((r) => [r.slug, r]));
  const slugs = new Set([...siteRoutes.map((r) => r.slug), ...doc.customRoutes.map((r) => r.slug)]);
  const routeFares: Record<string, number> = {};
  const customRoutes: CustomRoute[] = [];
  const kept = new Set<string>();
  const seen = new Set<string>();
  for (const row of list<FaresInput["routes"][number]>(input.routes, 60)) {
    const old = row.slug ? known.get(row.slug) : undefined;
    if (row.slug && !old) continue;
    const from = old ? old.from : text(row.from, 40);
    const to = old ? old.to : text(row.to, 40);
    const p = price(row.price);
    if (!from || !to) return { error: "Every route needs a pickup and a drop." };
    const pair = `${norm(from)}→${norm(to)}`;
    if (seen.has(pair)) return { error: `${from} → ${to} is already listed.` };
    seen.add(pair);
    if (p === null) return { error: `${from} → ${to} needs a fare above ₹0.` };
    if (old) {
      kept.add(old.slug);
      routeFares[old.slug] = p;
      const custom = doc.customRoutes.find((c) => c.slug === old.slug);
      if (custom) customRoutes.push(custom);
      continue;
    }
    // Adding back a site route that was taken off restores its page.
    const back = siteRoutes.find((r) => doc.removedRoutes.includes(r.slug) && `${norm(r.from)}→${norm(r.to)}` === pair);
    if (back) {
      kept.add(back.slug);
      routeFares[back.slug] = p;
      continue;
    }
    const km = typeof row.km === "number" && Number.isInteger(row.km) && row.km > 0 && row.km < 5000 ? row.km : null;
    if (km === null) return { error: `${from} → ${to} needs a distance in km.` };
    const slug = unique(slugify(`${from}-to-${to}`, "route"), slugs);
    routeFares[slug] = p;
    customRoutes.push({ slug, from, to, km });
  }
  // Site routes left out of the table come off the site (5.9); ones the editor never saw stay.
  const removedRoutes = siteRoutes.map((r) => r.slug).filter((s) => !kept.has(s) && (known.has(s) || doc.removedRoutes.includes(s)));

  // ---- Extras and rules ----
  const nightAllowance = typeof input.nightAllowance === "number" && Number.isInteger(input.nightAllowance) && input.nightAllowance >= 0 && input.nightAllowance <= MAX_PRICE ? input.nightAllowance : null;
  if (nightAllowance === null) return { error: "Night allowance must be a whole number of rupees." };
  const extraIds = new Set(doc.extras.map((e) => e.id));
  const extras: FareExtra[] = [];
  for (const row of list<FaresInput["extras"][number]>(input.extras, 12)) {
    const old = row.id ? doc.extras.find((e) => e.id === row.id) : undefined;
    if (row.id && !old) continue;
    const label = old ? old.label : text(row.label, 200);
    const value = text(row.value, 60);
    if (!label) return { error: "Every extra needs a name." };
    if (!old && !value) return { error: `${label} needs a value.` };
    extras.push({ id: old ? old.id : unique(`x-${slugify(label, "extra").slice(0, 24)}`, extraIds), label, value });
  }

  const saved = await saveFares({ perKm, hourly, routes: routeFares, nightAllowance }, { extras, customRoutes, removedRoutes });
  for (const m of moves) await updateCar(m.car, { fareClass: m.cls }, session.email);
  publishSite();
  return { ok: true, updatedAt: saved.updatedAt };
}
