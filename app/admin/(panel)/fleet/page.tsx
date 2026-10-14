import type { Metadata } from "next";
import Image from "next/image";
import { EditNote, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/adminAuth";
import { fleet } from "@/lib/site";

export const metadata: Metadata = { title: "Fleet" };

export default async function FleetPage() {
  await requireAdmin();
  const categories = [...new Set(fleet.map((v) => v.category))];

  return (
    <>
      <PageHeader
        title="Fleet"
        intro={`${fleet.length} vehicles listed on the site across ${categories.length} categories: ${categories.join(", ")}.`}
      />
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-wider text-khaki">
              <th className="px-4 py-3 font-semibold">Vehicle</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Seats</th>
              <th className="px-4 py-3 font-semibold">Specs</th>
              <th className="px-4 py-3 font-semibold">Note</th>
              <th className="px-4 py-3 text-right font-semibold">Rate</th>
            </tr>
          </thead>
          <tbody>
            {fleet.map((v) => (
              <tr key={v.name} className="border-b border-line align-top last:border-b-0">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-3">
                    <span className="relative block h-10 w-14 shrink-0 overflow-hidden rounded-md bg-cream">
                      <Image src={v.image} alt="" fill sizes="56px" className="object-cover" />
                    </span>
                    <span className="font-semibold text-ink">{v.name}</span>
                  </span>
                </td>
                <td className="px-4 py-2.5 text-khaki">{v.category}</td>
                <td className="px-4 py-2.5 text-khaki">{v.seats}</td>
                <td className="px-4 py-2.5 text-khaki">
                  {v.transmission} · {v.fuel}
                </td>
                <td className="max-w-xs px-4 py-2.5 text-xs text-khaki">{v.note}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-ink">{v.rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <EditNote />
      </div>
    </>
  );
}
