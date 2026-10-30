import { unstable_cache } from "next/cache";
import { inr, perKmLabel, rateForCar, type CarType } from "./catalogTypes";
import { getFares } from "./fares";
import { listCars } from "./fleet";
import { routes, type CabRoute } from "./site";

// What the public site shows: the fleet and fares as last saved in the admin
// panel, shaped for display. Tagged CATALOG_TAG so a save in the admin expires
// every public page that uses it at once (updateTag in app/admin/form.ts) —
// the next visitor gets the new prices, never a stale copy.

export const CATALOG_TAG = "catalog";

export type Vehicle = {
  name: string;
  category: CarType;
  seats: string;
  transmission: string;
  fuel: string;
  rate: string;
  image: string;
  note: string;
};

export type PublicRoute = CabRoute & { fareFrom: string };

export type Catalog = {
  vehicles: Vehicle[];
  perKmRates: { category: string; cars: string; rate: string }[];
  hourlyPackages: { name: string; for: string; price: string }[];
  routes: PublicRoute[];
  nightAllowance: string;
  fareNotes: string[];
};

export const getCatalog = unstable_cache(buildCatalog, ["public-catalog"], { tags: [CATALOG_TAG] });

async function buildCatalog(): Promise<Catalog> {
  const [cars, fares] = await Promise.all([listCars(), getFares()]);
  const shown = cars.filter((c) => c.shown);

  // Several physical cars of one model (e.g. three Scorpios) show as one card.
  const seen = new Set<string>();
  const vehicles: Vehicle[] = [];
  for (const c of shown) {
    const key = c.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    vehicles.push({
      name: c.name,
      category: c.type,
      seats: c.seats,
      transmission: c.transmission,
      fuel: c.fuel,
      rate: rateForCar(c, fares),
      image: c.image,
      note: c.note,
    });
  }

  const night = inr(fares.nightAllowance);
  return {
    vehicles,
    perKmRates: fares.perKm.map((cls) => ({
      category: cls.name,
      cars: [...new Set(shown.filter((c) => c.fareClass === cls.id).map((c) => c.name))].join(" · ") || "—",
      rate: perKmLabel(cls.rate),
    })),
    hourlyPackages: fares.hourly.map((p) => ({ name: p.name, for: p.for, price: inr(p.price) })),
    routes: routes.map((r) => ({ ...r, fareFrom: inr(fares.routes[r.slug] ?? 0) })),
    nightAllowance: night,
    fareNotes: [`Night driver allowance ${night} per night on outstation trips.`, ...fares.rules],
  };
}
