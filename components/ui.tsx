import Link from "next/link";
import { site, waLink, defaultWaText } from "@/lib/site";

export function SectionHead({
  eyebrow,
  title,
  lede,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  dark?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <p className={`font-mono text-xs font-semibold uppercase tracking-[0.18em] ${dark ? "text-amber" : "text-amberdeep"}`}>
        {eyebrow}
      </p>
      <h2 className={`mt-2 font-display text-3xl font-extrabold tracking-tight text-balance md:text-4xl ${dark ? "text-paper" : "text-ink"}`}>
        {title}
      </h2>
      {lede && (
        <p className={`mt-3 text-base leading-relaxed md:text-lg ${dark ? "text-sand" : "text-khaki"}`}>
          {lede}
        </p>
      )}
    </div>
  );
}

export function CtaBand({ heading = "Need a cab in the next hour?" }: { heading?: string }) {
  return (
    <section className="bg-night">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-14 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-paper md:text-3xl">{heading}</h2>
          <p className="mt-1.5 text-sand">
            One call books it. We answer 24/7 — yes, at 3 AM too.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={`tel:${site.phone}`}
            className="rounded-full bg-white px-7 py-3.5 font-mono text-base font-semibold text-ink transition-transform hover:-translate-y-0.5"
          >
            Call {site.phoneDisplay}
          </a>
          <a
            href={waLink(defaultWaText)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-amberdeep px-7 py-3.5 text-base font-bold text-white transition-colors hover:bg-amber"
          >
            WhatsApp us
          </a>
        </div>
      </div>
    </section>
  );
}

export function Crumb({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="font-mono text-xs uppercase tracking-wider text-khaki">
      {items.map((item, i) => (
        <span key={item.label}>
          {i > 0 && <span className="mx-2 text-sand">/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-amberdeep">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
