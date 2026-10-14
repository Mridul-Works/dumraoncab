import type { Metadata } from "next";
import { EditNote, PageHeader, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/adminAuth";
import { fareNotes, hourlyPackages, perKmRates, routes } from "@/lib/site";

export const metadata: Metadata = { title: "Routes & fares" };

export default async function FaresPage() {
  await requireAdmin();

  return (
    <>
      <PageHeader title="Routes & fares" intro="The published fares customers see on the site." />

      <div className="mt-6">
        <Panel title={`Routes (${routes.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <tbody>
                {routes.map((r) => (
                  <tr key={r.slug} className="border-b border-line last:border-b-0">
                    <td className="px-5 py-2.5 font-semibold text-ink">
                      <a href={`/routes/${r.slug}`} target="_blank" rel="noreferrer" className="hover:text-amberdeep">
                        {r.from} → {r.to}
                      </a>
                    </td>
                    <td className="px-5 py-2.5 text-khaki">
                      {r.distance} · {r.duration}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-xs font-semibold text-ink">from {r.fareFrom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Per-km rates (outstation)">
          <table className="w-full text-sm">
            <tbody>
              {perKmRates.map((r) => (
                <tr key={r.category} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-2.5">
                    <p className="font-semibold text-ink">{r.category}</p>
                    <p className="text-xs text-khaki">{r.cars}</p>
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-xs font-semibold text-ink">{r.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Hourly packages (local)">
          <table className="w-full text-sm">
            <tbody>
              {hourlyPackages.map((p) => (
                <tr key={p.name} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-2.5">
                    <p className="font-semibold text-ink">{p.name}</p>
                    <p className="text-xs text-khaki">{p.for}</p>
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-xs font-semibold text-ink">{p.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Fare notes">
          <ul className="list-disc space-y-1.5 py-4 pl-10 pr-5 text-sm text-ink">
            {fareNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="mt-3">
        <EditNote />
      </div>
    </>
  );
}
