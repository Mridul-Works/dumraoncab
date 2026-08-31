import Image from "next/image";
import Link from "next/link";
import { FaqList, RouteCard, ServiceCard, TestimonialGrid } from "@/components/cards";
import FleetBrowser from "@/components/FleetBrowser";
import { CtaBand, SectionHead } from "@/components/ui";
import { faqs, fleet, routes, services, site, steps, waLink, defaultWaText } from "@/lib/site";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Hero */}
      <section>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-12 md:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:pb-18 lg:pt-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-cream px-4 py-1.5 text-xs font-semibold text-khaki">
              <span className="size-1.5 rounded-full bg-amber" aria-hidden="true" />
              Cab &amp; car rental · Dumraon, Buxar · since {site.foundedYear}
            </p>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-balance text-ink sm:text-5xl lg:text-6xl">
              Anywhere in Bihar.
              <br />
              <span className="text-amberdeep">Any hour.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-khaki md:text-lg">
              Chauffeur-driven Scorpios, sedans and hatchbacks for airport runs, weddings,
              outstation trips and hourly hire. Fixed fares quoted before the car leaves —
              pay cash or UPI when the trip ends.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={`tel:${site.phone}`}
                className="rounded-full bg-night px-7 py-3.5 font-mono text-base font-semibold text-white transition-colors hover:bg-coal"
              >
                Call {site.phoneDisplay}
              </a>
              <a
                href={waLink(defaultWaText)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-amberdeep px-7 py-3.5 text-base font-bold text-white transition-colors hover:bg-night"
              >
                Book on WhatsApp
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-khaki">
              {["Police-verified drivers", "No hidden charges", "24/7, including 3 AM"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="text-amberdeep" aria-hidden="true">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-line shadow-xl shadow-night/10">
              <Image
                src={fleet[0].image}
                alt="Scorpio VLX from the Dumraon Cab Service fleet"
                width={720}
                height={540}
                priority
                sizes="(max-width: 1024px) 92vw, 45vw"
                className="aspect-[4/3] w-full bg-cream object-cover"
              />
            </div>
            <span className="plate absolute -bottom-4 left-6 text-base">
              EST. {site.foundedYear}
            </span>
            <p className="absolute right-4 top-4 rounded-full bg-white/90 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink shadow-sm">
              Our own car — no stock photos
            </p>
          </div>
        </div>

        {/* Real numbers, rendered statically — no counters to break */}
        <div className="border-y border-line bg-cream">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-9 md:grid-cols-4 md:px-8">
            {site.stats.map((s) => (
              <div key={s.label}>
                <p className="font-display text-3xl font-extrabold text-ink md:text-4xl">{s.value}</p>
                <p className="mt-1 text-sm font-medium text-khaki">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20" id="services">
        <SectionHead
          eyebrow="Services"
          title="What you can book"
          lede="Six ways we put a car and a trusted driver at your door — each with its own fares and details."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.slug} service={s} />
          ))}
        </div>
      </section>

      {/* Fleet */}
      <section className="border-y border-line bg-cream/60">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-amberdeep">
              The fleet
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-balance text-ink md:text-4xl">
              Choose your car
            </h2>
            <p className="mt-3 text-base leading-relaxed text-khaki md:text-lg">
              Real photos of the cars you&rsquo;ll actually ride in — filter by type and book the one
              that fits your trip.
            </p>
          </div>
          <FleetBrowser />
          <p className="mt-2 text-center">
            <Link href="/fleet" className="font-bold text-amberdeep hover:underline">
              See full fleet details &amp; fare tables →
            </Link>
          </p>
        </div>
      </section>

      {/* Routes & fares */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20" id="routes">
        <SectionHead
          eyebrow="Popular routes"
          title="Fixed fares on the roads you take most"
          lede="Indicative starting fares for our most-booked routes. Message us your exact pickup point for a firm quote."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {routes.map((r) => (
            <RouteCard key={r.slug} route={r} />
          ))}
          <div className="flex flex-col justify-center rounded-xl border-2 border-dashed border-line p-5">
            <p className="font-display text-base font-extrabold text-ink">Going somewhere else?</p>
            <p className="mt-1.5 text-sm text-khaki">
              We run to every district in Bihar and into UP and Jharkhand.
            </p>
            <a
              href={waLink("Hello Dumraon Cab Service, please quote a fare for my route.")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 font-bold text-amberdeep hover:underline"
            >
              Ask for any route on WhatsApp →
            </a>
          </div>
        </div>
      </section>

      {/* How it works — a real 4-step sequence */}
      <section className="bg-night text-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <SectionHead
            dark
            eyebrow="How it works"
            title="Booked in one call, paid after the trip"
          />
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <li key={step.title} className="relative">
                <span className="font-mono text-sm font-semibold text-amber">Step {i + 1}</span>
                <h3 className="mt-2 font-display text-lg font-extrabold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-sand">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why us */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <SectionHead
          eyebrow="Why riders stay"
          title="Ten years of showing up on time"
        />
        <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Fixed fare before pickup", "The quote you get on WhatsApp is the fare you pay. Tolls at actuals, receipts shared."],
            ["Verified local drivers", "Police-verified, background-checked drivers who know every road in Buxar district."],
            ["Genuinely 24/7", "Night trains, dawn flights, emergencies — we have answered the phone at every hour since 2014."],
            ["100+ vehicles, one call", "From a hatchback to a 20-car wedding convoy, capacity is never the problem."],
            ["Clean, insured cars", "Every vehicle is comprehensively insured and cleaned before your pickup."],
            ["Pay after the trip", "Cash or UPI when you arrive. No app wallets, no advance for regular bookings."],
          ].map(([title, text]) => (
            <div key={title} className="border-l-2 border-amber pl-4">
              <h3 className="font-display text-base font-extrabold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-khaki">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-line bg-cream/60">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <SectionHead
            eyebrow="Rider stories"
            title="What people say after the trip"
          />
          <div className="mt-10">
            <TestimonialGrid />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-20">
        <SectionHead
          eyebrow="Before you book"
          title="Questions we hear every day"
        />
        <div className="mt-8">
          <FaqList />
        </div>
      </section>

      <CtaBand />
    </>
  );
}
