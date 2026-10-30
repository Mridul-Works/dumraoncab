import type { Metadata } from "next";
import FaresEditor from "@/components/admin/FaresEditor";
import { requireAdmin } from "@/lib/adminAuth";
import { getFares } from "@/lib/fares";
import { listCars } from "@/lib/fleet";
import { routes, services } from "@/lib/site";

export const metadata: Metadata = { title: "Fares" };

export default async function FaresPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireAdmin();
  const [fares, cars, sp] = await Promise.all([getFares(), listCars(), searchParams]);

  const carsByClass: Record<string, string[]> = {};
  for (const c of cars) {
    if (!c.fareClass) continue;
    const list = (carsByClass[c.fareClass] ??= []);
    if (!list.includes(c.name)) list.push(c.name);
  }

  return (
    <FaresEditor
      fares={fares}
      carsByClass={carsByClass}
      routes={routes.map((r) => ({ slug: r.slug, from: r.from, to: r.to, distance: `${r.distance} · ${r.duration}` }))}
      servicePages={services.length}
      startInEdit={sp.edit === "1"}
    />
  );
}
