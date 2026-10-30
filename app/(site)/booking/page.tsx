import type { Metadata } from "next";
import BookingForm from "@/components/BookingForm";
import { FaqList } from "@/components/cards";
import { SectionHead } from "@/components/ui";
import { getCatalog } from "@/lib/catalog";
import { site, waLink, defaultWaText } from "@/lib/site";

export const metadata: Metadata = {
  title: "Book a Cab — Fixed Quote in Minutes",
  description:
    "Book a cab from Dumraon in under a minute: send the trip on WhatsApp, by phone or with the booking form and get a fixed quote. Per-km rates and hourly packages published.",
  alternates: { canonical: "/booking" },
};

export default async function BookingPage() {
  const { vehicles, perKmRates, hourlyPackages, nightAllowance } = await getCatalog();
  return (
    <>
      <section className="bg-brand-deep text-on-color">
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-gold">Booking</p>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-semibold tracking-tight text-balance md:text-5xl">
            Tell us the trip. Get a fixed quote in minutes.
          </h1>
          <p className="mt-4 max-w-2xl text-secondary-inverse">
            Fastest: call <a href={`tel:${site.phone}`} className="font-mono font-semibold text-gold">{site.phoneDisplay}</a> or{" "}
            <a href={waLink(defaultWaText)} target="_blank" rel="noopener noreferrer" className="font-semibold text-gold underline-offset-2 hover:underline">
              message us on WhatsApp
            </a>. Prefer a form? It builds the WhatsApp message for you.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:px-8 lg:grid-cols-[1.5fr_1fr]">
        <BookingForm vehicles={vehicles} />

        <aside className="flex flex-col gap-6">
          <div className="rounded-2xl border border-subtle bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-primary">Outstation per-km rates</h2>
            <ul className="mt-4 space-y-3">
              {perKmRates.map((r) => (
                <li key={r.category} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-primary">{r.category}</p>
                    <p className="text-xs text-secondary">{r.cars}</p>
                  </div>
                  <span className="plate text-sm">{r.rate}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-subtle bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-primary">Hourly packages</h2>
            <ul className="mt-4 space-y-3">
              {hourlyPackages.map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-3 text-sm">
                  <p className="font-semibold text-primary">{p.name}</p>
                  <span className="plate text-sm">{p.price}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-secondary">
              Indicative fares — your exact quote is fixed before the car leaves. Tolls and taxes at
              actuals, night allowance {nightAllowance}/night on outstation trips.
            </p>
          </div>
          <div className="rounded-2xl bg-brand-deep p-6 text-on-color">
            <h2 className="font-display text-lg font-semibold">Odd-hour trip?</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary-inverse">
              3 AM railway pickup, pre-dawn airport run — call a few hours ahead and the car will be
              positioned and waiting.
            </p>
            <a href={`tel:${site.phone}`} className="mt-4 inline-block font-mono text-base font-semibold text-gold">
              {site.phoneDisplay} — answered 24/7
            </a>
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-16 md:px-8">
        <SectionHead eyebrow="Before you book" title="Fair-fare questions, answered" />
        <div className="mt-8">
          <FaqList />
        </div>
      </section>
    </>
  );
}
