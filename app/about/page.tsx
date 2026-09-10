import type { Metadata } from "next";
import Image from "next/image";
import { CtaBand, SectionHead } from "@/components/ui";
import { fleet, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us — Ten Years of Cabs from Dumraon",
  description:
    "Dumraon Cab Service started in 2014 with three cars and now runs 100+ vehicles across Bihar. Verified drivers, fixed fares and a phone that answers at every hour.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <section className="bg-night text-paper">
        <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            About us
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-semibold tracking-tight text-balance md:text-5xl">
            Three cars in 2014. A hundred-strong fleet today. The same phone number throughout.
          </h1>
        </div>
        <div className="road-line mx-auto max-w-6xl" aria-hidden="true" />
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 md:grid-cols-4 md:px-8">
          {site.stats.map((s) => (
            <div key={s.label}>
              <p className="font-display text-3xl font-semibold text-gold md:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-sand">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-start gap-12 px-5 py-16 md:px-8 lg:grid-cols-2">
        <article>
          <h2 className="font-display text-2xl font-semibold text-ink">Our story</h2>
          <p className="mt-4 leading-relaxed text-khaki">
            Dumraon Cab Service began in {site.foundedYear} with three cars and a simple observation:
            people in and around Dumraon deserved a cab they could trust to actually turn up — at the
            station at 3 AM, at the airport gate when the flight is late, at the wedding venue with
            every convoy car together.
          </p>
          <p className="mt-4 leading-relaxed text-khaki">
            Ten years later the fleet has grown past a hundred vehicles, but the way we work has not
            changed. Fares are agreed before the car leaves. Drivers are police-verified locals who
            know every road in Buxar district. And the phone is answered by a person, at every hour,
            every day of the year.
          </p>
          <p className="mt-4 leading-relaxed text-khaki">
            Most of our business comes from riders who have travelled with us before, and from their
            families. That only happens when every single trip is treated as the one that earns the
            next one.
          </p>
        </article>
        <div className="relative">
          <div className="overflow-hidden rounded-2xl border border-line">
            <Image
              src={fleet[2].image}
              alt="Scorpio from the Dumraon Cab Service fleet"
              width={720}
              height={540}
              sizes="(max-width: 1024px) 92vw, 45vw"
              className="aspect-[4/3] w-full bg-cream object-cover"
            />
          </div>
          <span className="plate absolute -bottom-4 left-6 text-base shadow-lg">EST. {site.foundedYear}</span>
        </div>
      </section>

      <section className="border-y border-line bg-cream/60">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
          <SectionHead
            eyebrow="How we run"
            title="The standards behind every trip"
          />
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Drivers", "Every driver joins with police verification and a checked driving record. Night and highway duty is rotated so nobody drives tired."],
              ["Vehicles", "Comprehensively insured, serviced on schedule and cleaned before each pickup. A replacement car is guaranteed if one goes for service mid-contract."],
              ["Fares", "Quoted in full before the trip — per-km rate, night allowance, tolls at actuals. The number we send is the number you pay."],
              ["Availability", "24/7 is not a slogan; the booking phone has been answered at every hour since 2014."],
              ["Local knowledge", "We are from Dumraon. Ghat-side parking in Varanasi, arrival gates at Patna airport, shortcuts around Ara market — the driver already knows."],
              ["Accountability", "One owner-operated business, three phone numbers, no call centre. If anything is off, you talk to us directly and we fix it."],
            ].map(([title, text]) => (
              <div key={title} className="border-l-2 border-amber pl-4">
                <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-khaki">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-16 text-center md:px-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          Our aim is simple
        </h2>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-khaki">
          To be the cab service Bihar recommends to family — safe, fairly priced and there when you
          need it. If we ever fall short of that on your trip, call {site.phoneDisplay} and tell us.
        </p>
      </section>

      <CtaBand heading="Travel with people who show up" />
    </>
  );
}
