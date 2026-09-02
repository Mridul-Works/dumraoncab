import Link from "next/link";
import type { CabRoute, Service } from "@/lib/site";
import { faqs, testimonials, waLink } from "@/lib/site";

const serviceIcons: Record<string, React.ReactNode> = {
  "hourly-rental": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
    </svg>
  ),
  "outstation-trips": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20 8 4h8l4 16" /><path d="M12 7v2m0 4v2m0 4v1" />
    </svg>
  ),
  "airport-transfers": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  ),
  "one-way-drops": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M8 12h8m-3-3 3 3-3 3" />
    </svg>
  ),
  "wedding-cars": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="14" r="5" /><circle cx="15" cy="14" r="5" /><path d="m9 6 1.5-2h3L15 6" />
    </svg>
  ),
  "corporate-rental": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-12 5h18" />
    </svg>
  ),
};

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      href={`/services/${service.slug}`}
      className="group flex flex-col rounded-2xl border border-line bg-white p-6 transition-all hover:-translate-y-1 hover:border-amber hover:shadow-xl hover:shadow-night/8"
    >
      <span className="grid size-11 place-items-center rounded-xl bg-cream text-amberdeep transition-colors group-hover:bg-amberdeep group-hover:text-white">
        {serviceIcons[service.slug]}
      </span>
      <h3 className="mt-4 font-display text-lg font-extrabold tracking-tight text-ink">{service.name}</h3>
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
      className="group flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 transition-all hover:-translate-y-1 hover:border-amber hover:shadow-xl hover:shadow-night/8"
    >
      <div className="flex items-center gap-2 font-display text-base font-extrabold text-ink">
        {route.from}
        <span aria-hidden="true" className="text-amberdeep transition-transform group-hover:translate-x-1">⟶</span>
        {route.to}
      </div>
      <p className="flex-1 text-sm leading-relaxed text-khaki">{route.blurb}</p>
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-khaki">
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 20 8 4h8l4 16" /></svg>
          {route.distance}
        </span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
          {route.duration}
        </span>
        <span className="plate ml-auto text-sm transition-colors group-hover:border-amber">from {route.fareFrom}</span>
      </div>
    </Link>
  );
}

export function TestimonialGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {testimonials.map((t) => (
        <figure key={t.quote} className="relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white p-6">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-3 right-4 font-display text-[90px] font-extrabold leading-none text-cream select-none"
          >
            &rdquo;
          </span>
          <div className="relative text-amber" aria-label="5 star rating">★★★★★</div>
          <blockquote className="relative mt-3 flex-1 text-[15px] leading-relaxed text-ink">
            &ldquo;{t.quote}&rdquo;
          </blockquote>
          <figcaption className="relative mt-5 flex items-center gap-3 border-t border-line pt-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cream font-display text-base font-extrabold text-amberdeep">
              {t.name.charAt(0)}
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">{t.name}</span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-khaki">{t.trip}</span>
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function FaqList() {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-white">
      {faqs.map((f) => (
        <details key={f.q} className="faq group px-6 py-1">
          <summary className="flex items-center justify-between gap-4 py-4 text-left font-semibold text-ink transition-colors hover:text-amberdeep">
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
