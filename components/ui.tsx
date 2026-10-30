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
      <p
        className={`flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] ${
          dark ? "text-gold" : "text-brand"
        }`}
      >
        <span className="h-0.5 w-6 rounded-full bg-gold" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2
        className={`mt-4 font-display text-3xl font-semibold tracking-tight text-balance md:text-[2.6rem] md:leading-[1.08] ${
          dark ? "text-on-color" : "text-primary"
        }`}
      >
        {title}
      </h2>
      {lede && (
        <p className={`mt-3 max-w-[52ch] text-base leading-relaxed ${dark ? "text-secondary-inverse" : "text-secondary"}`}>
          {lede}
        </p>
      )}
    </div>
  );
}

export function CtaBand({ heading = "Ready when you are." }: { heading?: string }) {
  return (
    <section className="px-3 pb-4 md:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-brand-hover text-white">
        {/* dashed road line across the band */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-[5%] -right-[5%] top-[74%] h-0.5 -rotate-3 [background:repeating-linear-gradient(90deg,rgb(255_255_255/0.18)_0_14px,transparent_14px_28px)]"
        />
        <div className="relative mx-auto max-w-3xl px-6 py-16 text-center md:py-24">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance md:text-5xl">{heading}</h2>
          <p className="mt-4 text-base text-white/75 md:text-lg">
            Tell us where you&rsquo;re going and we&rsquo;ll help you get there — 24/7, at 3 AM too.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a
              href={`tel:${site.phone}`}
              className="rounded-xl bg-white px-7 py-3.5 font-semibold text-brand-strong transition-colors hover:bg-selected"
            >
              Call {site.phoneDisplay}
            </a>
            <a
              href={waLink(defaultWaText)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-white/35 px-7 py-3.5 font-semibold text-white transition-colors hover:border-white"
            >
              WhatsApp us
            </a>
          </div>
          <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.14em] text-white/50">
            Dumraon · Buxar district · Bihar {site.address.postalCode} — available 24/7
          </p>
        </div>
      </div>
    </section>
  );
}
