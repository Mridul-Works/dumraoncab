import Link from "next/link";
import { FaqList, RouteCard, ServiceCard, TestimonialGrid } from "@/components/cards";
import FleetBrowser from "@/components/FleetBrowser";
import HeroBooking from "@/components/HeroBooking";
import Reveal from "@/components/Reveal";
import { CtaBand, SectionHead } from "@/components/ui";
import { faqs, routes, services, site, steps, waLink } from "@/lib/site";

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

      {/* Hero — booking-widget-first, MakeMyTrip style */}
      <HeroBooking />

      {/* Trust bar — real numbers, rendered statically */}
      <div className="border-y border-ink/5 bg-white py-6">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-5 px-5 md:grid-cols-4 md:px-8">
          {site.stats.map((s, i) => (
            <div key={s.label} className="flex items-center gap-3.5 md:justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber" aria-hidden="true">
                {i === 0 && <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /></>}
                {i === 1 && <><path d="M5 16v-4q0-2 2-2h10q2 0 2 2v4" /><path d="M7 10l1.5-3.5q.5-1 1.5-1h4q1 0 1.5 1L17 10" /><circle cx="8" cy="16.5" r="1.6" /><circle cx="16" cy="16.5" r="1.6" /></>}
                {i === 2 && <><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>}
                {i === 3 && <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>}
              </svg>
              <div>
                <b className="block font-display text-base font-semibold tracking-tight text-ink">{s.value}</b>
                <span className="block text-xs text-sand">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Services */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20" id="services">
        <SectionHead
          eyebrow="Services"
          title="What you can book"
          lede="Six ways we put a car and a trusted driver at your door — each with its own fares and details."
        />
        <Reveal className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.slug} service={s} />
          ))}
        </Reveal>
      </section>

      {/* Fleet */}
      <section className="border-y border-line bg-cream/60">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-amberdeep">
              The fleet
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-balance text-ink md:text-4xl">
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
        <Reveal className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {routes.map((r) => (
            <RouteCard key={r.slug} route={r} />
          ))}
          <div className="flex flex-col justify-center rounded-xl border-2 border-dashed border-line p-5">
            <p className="font-display text-base font-semibold text-ink">Going somewhere else?</p>
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
        </Reveal>
      </section>

      {/* How it works — a real 4-step sequence */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <SectionHead eyebrow="How it works" title="Four steps. Zero hassle." />
          <Reveal>
            <ol className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 top-[23px] hidden h-0.5 rounded-full bg-ink/10 lg:block"
              />
              {steps.map((step, i) => (
                <li key={step.title} className="relative">
                  <span className="relative z-[1] grid size-[46px] place-items-center rounded-full border-[1.5px] border-line bg-white font-mono text-sm text-ink">
                    0{i + 1}
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1.5 max-w-[28ch] text-sm leading-relaxed text-khaki">{step.text}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* Why us */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <SectionHead
          eyebrow="Why riders stay"
          title="Ten years of showing up on time"
        />
        <Reveal className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Fixed fare before pickup", "The quote you get on WhatsApp is the fare you pay. Tolls at actuals, receipts shared."],
            ["Verified local drivers", "Police-verified, background-checked drivers who know every road in Buxar district."],
            ["Genuinely 24/7", "Night trains, dawn flights, emergencies — we have answered the phone at every hour since 2014."],
            ["100+ vehicles, one call", "From a hatchback to a 20-car wedding convoy, capacity is never the problem."],
            ["Clean, insured cars", "Every vehicle is comprehensively insured and cleaned before your pickup."],
            ["Pay after the trip", "Cash or UPI when you arrive. No app wallets, no advance for regular bookings."],
          ].map(([title, text]) => (
            <div key={title} className="border-l-2 border-amber pl-4">
              <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-khaki">{text}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Testimonials */}
      <section className="border-y border-line bg-cream/60">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <SectionHead
            eyebrow="Rider stories"
            title="What people say after the trip"
          />
          <Reveal className="mt-10">
            <TestimonialGrid />
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-20">
        <SectionHead
          eyebrow="Before you book"
          title="Questions we hear every day"
        />
        <Reveal className="mt-8">
          <FaqList />
        </Reveal>
      </section>

      <CtaBand />
    </>
  );
}
