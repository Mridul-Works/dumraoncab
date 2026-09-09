import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuoteLink, RouteCard } from "@/components/cards";
import { CtaBand } from "@/components/ui";
import { routes, site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return routes.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const route = routes.find((r) => r.slug === slug);
  if (!route) return {};
  return {
    title: `${route.from} to ${route.to} Cab — ${route.distance}, fares from ${route.fareFrom}`,
    description: `Book a ${route.from} to ${route.to} taxi with Dumraon Cab Service. ${route.distance}, ${route.duration}, fares from ${route.fareFrom}. Fixed quote on WhatsApp, 24/7 — call ${site.phoneDisplay}.`,
    alternates: { canonical: `/routes/${route.slug}` },
  };
}

export default async function RoutePage({ params }: Props) {
  const { slug } = await params;
  const route = routes.find((r) => r.slug === slug);
  if (!route) notFound();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site.url },
      { "@type": "ListItem", position: 2, name: "Routes", item: `${site.url}/routes` },
      { "@type": "ListItem", position: 3, name: `${route.from} to ${route.to}`, item: `${site.url}/routes/${route.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <section className="bg-night text-paper">
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
          <nav aria-label="Breadcrumb" className="font-mono text-xs uppercase tracking-wider text-sand">
            <Link href="/" className="hover:text-amber">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/routes" className="hover:text-amber">Routes</Link>
          </nav>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-balance md:text-5xl">
            {route.from} <span aria-hidden="true" className="text-amber">⟶</span> {route.to}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-3 font-mono text-sm text-sand">
            <span className="rounded-md border border-linedark px-3 py-1.5">{route.distance}</span>
            <span className="rounded-md border border-linedark px-3 py-1.5">{route.duration}</span>
            <span className="plate text-base">from {route.fareFrom}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-14 md:px-8 lg:grid-cols-[1.4fr_1fr]">
        <article>
          <h2 className="font-display text-2xl font-extrabold text-ink">About this route</h2>
          {route.detail.map((p) => (
            <p key={p.slice(0, 24)} className="mt-4 max-w-2xl leading-relaxed text-khaki">{p}</p>
          ))}
          <h3 className="mt-8 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-amberdeep">
            Every trip includes
          </h3>
          <ul className="mt-3 space-y-2.5">
            {[
              "Door-to-door pickup anywhere in and around Dumraon",
              "Fixed fare agreed on WhatsApp before departure",
              "Verified driver, insured vehicle, luggage space planned in advance",
              "Pay by cash or UPI at the end of the trip",
            ].map((item) => (
              <li key={item} className="flex gap-3 text-[15px] text-ink">
                <span className="mt-0.5 text-leaf" aria-hidden="true">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-khaki">
            Fares shown are indicative starting fares for the smallest suitable car. Your exact quote
            depends on car class, waiting time and season — and is fixed before the car leaves.
          </p>
        </article>

        <aside className="h-fit rounded-2xl border border-line bg-white p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-extrabold text-ink">Book this route</h2>
          <p className="mt-2 text-sm leading-relaxed text-khaki">
            Send the date and pickup point — we confirm the car, driver and exact fare in minutes.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <QuoteLink
              text={`Hello Dumraon Cab Service, I want to book a cab from ${route.from} to ${route.to}.`}
              label="Get a fixed quote on WhatsApp"
            />
            <a
              href={`tel:${site.phone}`}
              className="rounded-full border border-line px-5 py-2.5 text-center font-mono text-sm font-semibold text-ink transition-colors hover:border-amber hover:text-amberdeep"
            >
              Call {site.phoneDisplay}
            </a>
          </div>
          <p className="mt-5 border-t border-line pt-4 font-mono text-xs uppercase tracking-wider text-leaf">
            Open now · 24/7 every day
          </p>
        </aside>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 md:px-8">
        <h2 className="font-display text-xl font-extrabold text-ink">Other popular routes</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {routes
            .filter((r) => r.slug !== route.slug)
            .map((r) => (
              <RouteCard key={r.slug} route={r} />
            ))}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
