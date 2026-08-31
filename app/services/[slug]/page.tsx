import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuoteLink } from "@/components/cards";
import { CtaBand } from "@/components/ui";
import { services, site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) return {};
  return {
    title: `${service.name} in Dumraon, Buxar`,
    description: `${service.short} Fixed fares, verified drivers, 24/7 booking — call ${site.phoneDisplay}.`,
    alternates: { canonical: `/services/${service.slug}` },
  };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: service.name,
    name: `${service.name} — ${site.name}`,
    description: service.short,
    provider: { "@type": "LocalBusiness", name: site.name, telephone: site.phone },
    areaServed: site.serviceAreas.map((name) => ({ "@type": "Place", name })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="bg-night text-paper">
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
          <nav aria-label="Breadcrumb" className="font-mono text-xs uppercase tracking-wider text-sand">
            <Link href="/" className="hover:text-amber">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/services" className="hover:text-amber">Services</Link>
            <span className="mx-2">/</span>
            <span className="text-amber">{service.name}</span>
          </nav>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-extrabold tracking-tight text-balance md:text-5xl">
            {service.hero}
          </h1>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-14 md:px-8 lg:grid-cols-[1.4fr_1fr]">
        <article>
          <h2 className="font-display text-2xl font-extrabold text-ink">{service.name}</h2>
          {service.body.map((p) => (
            <p key={p.slice(0, 24)} className="mt-4 max-w-2xl leading-relaxed text-khaki">
              {p}
            </p>
          ))}
          <h3 className="mt-8 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-amberdeep">
            What&rsquo;s included
          </h3>
          <ul className="mt-3 space-y-2.5">
            {service.includes.map((item) => (
              <li key={item} className="flex gap-3 text-[15px] text-ink">
                <span className="mt-0.5 text-leaf" aria-hidden="true">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-8 rounded-xl border border-line bg-cream/70 px-5 py-4 text-sm leading-relaxed text-ink">
            <span className="font-bold">Which car?</span> {service.bestCars}{" "}
            <Link href="/fleet" className="font-semibold text-amberdeep hover:underline">
              Browse the fleet →
            </Link>
          </p>
        </article>

        <aside className="h-fit rounded-2xl border border-line bg-white p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-extrabold text-ink">Get a fixed quote</h2>
          <p className="mt-2 text-sm leading-relaxed text-khaki">
            Tell us the date and pickup point — we reply with the fare and car options, usually within minutes.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <QuoteLink
              text={`Hello Dumraon Cab Service, I want a quote for ${service.name}.`}
              label={`WhatsApp quote for ${service.name}`}
            />
            <a
              href={`tel:${site.phone}`}
              className="rounded-full border border-line px-5 py-2.5 text-center font-mono text-sm font-semibold text-ink transition-colors hover:border-amber hover:text-amberdeep"
            >
              Call {site.phoneDisplay}
            </a>
            <Link href="/booking" className="text-center text-sm font-bold text-amberdeep hover:underline">
              Or use the booking form →
            </Link>
          </div>
          <p className="mt-5 border-t border-line pt-4 font-mono text-xs uppercase tracking-wider text-leaf">
            Open now · 24/7 every day
          </p>
        </aside>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 md:px-8">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-amberdeep">
          Other services
        </h2>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {services
            .filter((s) => s.slug !== service.slug)
            .map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-amber hover:text-amberdeep"
              >
                {s.name}
              </Link>
            ))}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
