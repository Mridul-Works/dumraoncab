import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Booking, fare, cancellation and payment terms for Dumraon Cab Service trips.",
  alternates: { canonical: "/terms" },
};

const terms = [
  {
    h: "Bookings & fares",
    p: "Every trip is confirmed with a fixed quote on phone or WhatsApp before the car leaves. The quote covers vehicle, driver and fuel; tolls, parking and state taxes are billed at actuals with receipts. Outstation round trips are billed on total kilometres, with a fixed night allowance (shown on the fleet page) when the driver stays out overnight.",
  },
  {
    h: "Cancellations",
    p: "Regular bookings can be cancelled free of charge up to 2 hours before pickup by phone or WhatsApp. Wedding convoys and multi-day itineraries follow the terms agreed at the time of the token payment.",
  },
  {
    h: "Payment",
    p: "Pay by cash or UPI at the end of the trip. No advance is needed for regular bookings; peak-date convoy and multi-day bookings may need a token to block vehicles.",
  },
  {
    h: "During the trip",
    p: "Vehicles are comprehensively insured and drivers are police-verified. Smoking and consumption of alcohol in the vehicle are not permitted. Waiting time beyond the agreed schedule may be charged at the rate shared in your quote.",
  },
  {
    h: "Our liability",
    p: "We do our best to run on time in all conditions, but we are not liable for delays caused by traffic, weather, road closures or events beyond our control. For anything that goes wrong on a trip, call the booking line — the owner handles complaints directly.",
  },
];

export default function TermsPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-14 md:px-8">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">Legal</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-primary md:text-4xl">
        Terms of service
      </h1>
      <p className="mt-4 leading-relaxed text-secondary">
        Booking with {site.name} means agreeing to the terms below. They exist to keep fares
        transparent and trips predictable — the same promises we make everywhere on this site.
      </p>
      <div className="mt-8 space-y-6">
        {terms.map((t) => (
          <div key={t.h} className="border-l-2 border-brand pl-4">
            <h2 className="font-display text-lg font-semibold text-primary">{t.h}</h2>
            <p className="mt-1.5 leading-relaxed text-secondary">{t.p}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-secondary">
        Questions before you book: {site.phoneDisplay} · {site.email}.
      </p>
    </section>
  );
}
