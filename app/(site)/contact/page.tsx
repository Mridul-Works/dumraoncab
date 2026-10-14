import type { Metadata } from "next";
import { SectionHead } from "@/components/ui";
import { site, waLink, defaultWaText } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact — Phones, WhatsApp & Office in Dumraon",
  description:
    "Reach Dumraon Cab Service: call 95258 02341 (24/7), WhatsApp, email info@dumraoncab.com or visit us in Dumraon, Buxar district, Bihar 802136.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <SectionHead
          eyebrow="Contact"
          title="A person answers, at every hour"
          lede="No call centre and no ticket queue — the numbers below ring with us directly, every day of the year."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <a
            href={`tel:${site.phone}`}
            className="group rounded-xl border border-line bg-white p-6 transition-all hover:-translate-y-1 hover:border-amber hover:shadow-lg hover:shadow-amber/10"
          >
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-amberdeep">Call — fastest</p>
            <p className="mt-3"><span className="plate text-base">{site.phoneDisplay}</span></p>
            <p className="mt-3 text-sm text-khaki">
              Booking line, answered 24/7. Alternates:{" "}
              {site.altPhones.map((p, i) => (
                <span key={p.raw} className="whitespace-nowrap font-mono text-ink">
                  {i > 0 && " · "}
                  {p.display}
                </span>
              ))}
            </p>
          </a>

          <a
            href={waLink(defaultWaText)}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-line bg-white p-6 transition-all hover:-translate-y-1 hover:border-amber hover:shadow-lg hover:shadow-amber/10"
          >
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-amberdeep">WhatsApp</p>
            <p className="mt-3 font-display text-lg font-semibold text-ink">Message us the trip</p>
            <p className="mt-3 text-sm text-khaki">
              Send pickup, destination and date — get a fixed quote back, usually within minutes.
            </p>
          </a>

          <a
            href={`mailto:${site.email}`}
            className="group rounded-xl border border-line bg-white p-6 transition-all hover:-translate-y-1 hover:border-amber hover:shadow-lg hover:shadow-amber/10"
          >
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-amberdeep">Email</p>
            <p className="mt-3 font-display text-lg font-semibold text-ink">{site.email}</p>
            <p className="mt-3 text-sm text-khaki">
              Best for corporate enquiries, monthly contracts and wedding convoy planning.
            </p>
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-16 md:px-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Find us</h2>
          <address className="mt-3 text-sm not-italic leading-relaxed text-khaki">
            {site.name}
            <br />
            {site.address.locality}, {site.address.district} district
            <br />
            {site.address.region} — {site.address.postalCode}
          </address>
          <p className="mt-3 font-mono text-xs uppercase tracking-wider text-leaf">Open 24 hours · 7 days</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line">
          <iframe
            title="Dumraon Cab Service location — Dumraon, Buxar, Bihar"
            src="https://www.google.com/maps?q=Dumraon,+Buxar,+Bihar+802136&output=embed"
            className="h-full min-h-72 w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </section>
    </>
  );
}
