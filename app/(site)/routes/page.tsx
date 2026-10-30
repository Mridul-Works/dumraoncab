import type { Metadata } from "next";
import { RouteCard } from "@/components/cards";
import { CtaBand, SectionHead } from "@/components/ui";
import { getCatalog } from "@/lib/catalog";
import { site, waLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Popular Routes & Fixed Fares from Dumraon",
  description:
    "All popular taxi routes from Dumraon with distance, travel time and indicative fares — Patna Airport, Buxar, Ara, Varanasi and Gaya. Fixed quotes on WhatsApp, 24/7.",
  alternates: { canonical: "/routes" },
};

export default async function RoutesPage() {
  const { routes } = await getCatalog();
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <SectionHead
          eyebrow="Routes & fares"
          title="Every popular road out of Dumraon"
          lede="Indicative starting fares for the trips we run most. Any route not listed? Message us the pickup and drop — we quote every road in Bihar, UP and Jharkhand."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {routes.map((r) => (
            <RouteCard key={r.slug} route={r} />
          ))}
          <div className="flex flex-col justify-center rounded-2xl border-2 border-dashed border-subtle p-5">
            <p className="font-display text-base font-semibold text-primary">Somewhere else?</p>
            <p className="mt-1.5 text-sm text-secondary">
              We run to every district in Bihar and beyond — {site.phoneDisplay} answers 24/7.
            </p>
            <a
              href={waLink("Hello Dumraon Cab Service, please quote a fare for my route.")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 font-bold text-brand-strong hover:underline"
            >
              Ask for any route on WhatsApp →
            </a>
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
