import type { Metadata } from "next";
import FleetBrowser from "@/components/FleetBrowser";
import { CtaBand, SectionHead } from "@/components/ui";
import { hourlyPackages, perKmRates, fareNotes } from "@/lib/site";

export const metadata: Metadata = {
  title: "Our Fleet & Fares — Scorpio, XL6, Nexon and More",
  description:
    "Real photos of the Dumraon Cab Service fleet — Scorpio, XL6, Nexon, Altroz, Grand i10 and more — with per-km rates and hourly package fares.",
  alternates: { canonical: "/fleet" },
};

export default function FleetPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-amberdeep">
            The fleet
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-balance text-ink md:text-4xl">
            Our cars, photographed as they are
          </h1>
          <p className="mt-3 text-base leading-relaxed text-khaki md:text-lg">
            No stock images anywhere on this page — every photo is a Dumraon Cab Service vehicle you
            can actually book. Filter by type, pick a car, and message us to reserve it.
          </p>
        </div>
        <FleetBrowser />
      </section>

      <section className="border-y border-line bg-cream/60">
        <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
          <SectionHead
            eyebrow="Fares"
            title="Rates with nothing hidden"
            lede="Indicative rates — your exact quote depends on route and season, and is fixed before the car leaves."
          />

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <h3 className="border-b border-line px-5 py-3.5 font-display text-base font-extrabold text-ink">
                Outstation — per kilometre
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left font-mono text-[11px] uppercase tracking-wider text-khaki">
                    <th className="px-5 py-2.5 font-semibold">Class</th>
                    <th className="px-5 py-2.5 font-semibold">Cars</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {perKmRates.map((r) => (
                    <tr key={r.category} className="border-t border-line">
                      <td className="px-5 py-3 font-semibold text-ink">{r.category}</td>
                      <td className="px-5 py-3 text-khaki">{r.cars}</td>
                      <td className="px-5 py-3 text-right">
                        <span className="plate text-sm">{r.rate}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <h3 className="border-b border-line px-5 py-3.5 font-display text-base font-extrabold text-ink">
                Local — hourly packages
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left font-mono text-[11px] uppercase tracking-wider text-khaki">
                    <th className="px-5 py-2.5 font-semibold">Package</th>
                    <th className="px-5 py-2.5 font-semibold">Good for</th>
                    <th className="px-5 py-2.5 text-right font-semibold">From</th>
                  </tr>
                </thead>
                <tbody>
                  {hourlyPackages.map((p) => (
                    <tr key={p.name} className="border-t border-line">
                      <td className="px-5 py-3 font-semibold text-ink">{p.name}</td>
                      <td className="px-5 py-3 text-khaki">{p.for}</td>
                      <td className="px-5 py-3 text-right">
                        <span className="plate text-sm">{p.price}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ul className="mt-8 grid gap-2.5 text-sm text-khaki md:grid-cols-2">
            {fareNotes.map((note) => (
              <li key={note} className="flex gap-2.5">
                <span className="text-amberdeep" aria-hidden="true">•</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand heading="Pick a car, we'll quote the trip" />
    </>
  );
}
