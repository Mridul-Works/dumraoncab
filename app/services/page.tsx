import type { Metadata } from "next";
import { ServiceCard } from "@/components/cards";
import { CtaBand, SectionHead } from "@/components/ui";
import { services } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cab Services in Dumraon — Airport, Outstation, Wedding & Hourly",
  description:
    "Six chauffeur-driven services from Dumraon, Buxar: hourly rental, outstation trips, Patna airport transfers, one-way drops, wedding convoys and corporate rental. Fixed fares, 24/7.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-18">
        <SectionHead
          eyebrow="Services"
          title="Six ways to book a car and driver"
          lede="Every service below comes with the same promises: a verified driver, a fixed quote before pickup, and payment only when the trip ends."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.slug} service={s} />
          ))}
        </div>
      </section>
      <CtaBand heading="Not sure which service fits?" />
    </>
  );
}
