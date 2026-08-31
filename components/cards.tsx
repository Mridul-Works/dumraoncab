import Link from "next/link";
import type { CabRoute, Service } from "@/lib/site";
import { faqs, testimonials, waLink } from "@/lib/site";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      href={`/services/${service.slug}`}
      className="group flex flex-col rounded-xl border border-line bg-white p-6 transition-all hover:-translate-y-1 hover:border-amber hover:shadow-lg hover:shadow-amber/10"
    >
      <h3 className="font-display text-lg font-extrabold tracking-tight text-ink">{service.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-khaki">{service.short}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-amberdeep">
        See details & fares
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}

export function RouteCard({ route }: { route: CabRoute }) {
  return (
    <Link
      href={`/routes/${route.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-line bg-white p-5 transition-all hover:-translate-y-1 hover:border-amber hover:shadow-lg hover:shadow-amber/10"
    >
      <div className="flex items-center gap-2 font-display text-base font-extrabold text-ink">
        {route.from}
        <span aria-hidden="true" className="text-amberdeep">⟶</span>
        {route.to}
      </div>
      <p className="flex-1 text-sm leading-relaxed text-khaki">{route.blurb}</p>
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-khaki">
        <span>{route.distance}</span>
        <span aria-hidden="true">·</span>
        <span>{route.duration}</span>
        <span className="plate ml-auto text-sm">from {route.fareFrom}</span>
      </div>
    </Link>
  );
}

export function TestimonialGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {testimonials.map((t) => (
        <figure key={t.quote} className="flex flex-col rounded-xl border border-line bg-white p-6">
          <div className="text-amber" aria-label="5 star rating">★★★★★</div>
          <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-ink">
            &ldquo;{t.quote}&rdquo;
          </blockquote>
          <figcaption className="mt-4 border-t border-line pt-3">
            <span className="block text-sm font-semibold text-ink">{t.name}</span>
            <span className="font-mono text-xs uppercase tracking-wider text-khaki">{t.trip}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function FaqList() {
  return (
    <div className="divide-y divide-line rounded-xl border border-line bg-white">
      {faqs.map((f) => (
        <details key={f.q} className="faq group px-6 py-1">
          <summary className="flex items-center justify-between gap-4 py-4 text-left font-semibold text-ink">
            {f.q}
            <span className="faq-icon grid size-7 shrink-0 place-items-center rounded-full bg-cream font-mono text-base text-amberdeep" aria-hidden="true">
              +
            </span>
          </summary>
          <p className="max-w-3xl pb-5 text-[15px] leading-relaxed text-khaki">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function QuoteLink({ text, label }: { text: string; label: string }) {
  return (
    <a
      href={waLink(text)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-full bg-amberdeep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night"
    >
      {label}
    </a>
  );
}
