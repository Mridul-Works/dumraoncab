import type { Metadata } from "next";
import FaresEditor from "@/components/admin/FaresEditor";
import FaresLoadFailed from "@/components/admin/fares/FaresLoadFailed";
import { requireAdmin } from "@/lib/adminAuth";
import { getFaresDoc, type FaresDoc } from "@/lib/fares";
import { listCars } from "@/lib/fleet";
import type { Car } from "@/lib/catalogTypes";
import { services } from "@/lib/site";

export const metadata: Metadata = { title: "Fares" };

export default async function FaresPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;

  // 5.11 — if the store can't be read, say so instead of showing an error page.
  let doc: FaresDoc;
  let cars: Car[];
  try {
    [doc, cars] = await Promise.all([getFaresDoc(), listCars()]);
  } catch (err) {
    console.error("Fares didn't load", err);
    return <FaresLoadFailed />;
  }

  return (
    <FaresEditor
      fares={doc.fares}
      routes={doc.routes}
      extras={doc.extras}
      cars={cars.map((c) => ({ id: c.id, name: c.name, number: c.number, type: c.type, fareClass: c.fareClass }))}
      servicePages={services.length}
      startInEdit={sp.edit === "1"}
    />
  );
}
