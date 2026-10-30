import Link from "next/link";
import { site, services, routes } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="pb-24 pt-14 text-sm text-secondary md:pb-14">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-2 md:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-[10px] bg-brand">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 16 L5 12 Q5 10 7 10 L17 10 Q19 10 19 12 L19 16" />
                <path d="M7 10 L8.5 6.5 Q9 5.5 10 5.5 L14 5.5 Q15 5.5 15.5 6.5 L17 10" />
                <circle cx="8" cy="16.5" r="1.6" />
                <circle cx="16" cy="16.5" r="1.6" />
              </svg>
            </span>
            <span className="font-display text-lg font-semibold text-primary">Dumraon Cab</span>
          </Link>
          <p className="mt-4 max-w-[30ch] leading-relaxed">
            Reliable, affordable, safe rides — anytime, across Bihar and beyond, since {site.foundedYear}.
          </p>
          <p className="mt-4">
            <span className="plate">{site.phoneDisplay}</span>
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-helper">Services</h3>
          <ul className="space-y-2.5">
            {services.map((s) => (
              <li key={s.slug}>
                <Link href={`/services/${s.slug}`} className="transition-colors hover:text-brand">
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-helper">Popular routes</h3>
          <ul className="space-y-2.5">
            {routes.map((r) => (
              <li key={r.slug}>
                <Link href={`/routes/${r.slug}`} className="transition-colors hover:text-brand">
                  {r.from} → {r.to}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/routes" className="transition-colors hover:text-brand">All routes &amp; fares</Link>
            </li>
            <li>
              <Link href="/fleet" className="transition-colors hover:text-brand">Our fleet</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-helper">Contact</h3>
          <address className="space-y-2.5 not-italic">
            <p>
              <a href={`tel:${site.phone}`} className="hover:text-brand">{site.phoneDisplay}</a>
              {site.altPhones.map((p) => (
                <span key={p.raw}>
                  {" · "}
                  <a href={`tel:${p.raw}`} className="hover:text-brand">{p.display}</a>
                </span>
              ))}
            </p>
            <p>
              <a href={`mailto:${site.email}`} className="hover:text-brand">{site.email}</a>
            </p>
            <p>
              {site.address.locality}, {site.address.district} district,
              <br />
              {site.address.region} — {site.address.postalCode}
            </p>
            <p className="font-mono text-xs uppercase tracking-widest text-brand">Open 24 hours · every day</p>
          </address>
        </div>
      </div>

      <div className="mx-auto mt-11 max-w-6xl px-5 md:px-8">
        <div className="flex flex-col gap-2 border-t border-black/10 pt-5 text-xs text-helper md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
            <span className="mx-2" aria-hidden="true">·</span>
            <Link href="/privacy" className="hover:text-brand">Privacy</Link>
            <span className="mx-2" aria-hidden="true">·</span>
            <Link href="/terms" className="hover:text-brand">Terms</Link>
          </p>
          <p>Serving {site.serviceAreas.slice(0, -1).join(" · ")} — since {site.foundedYear}</p>
        </div>
      </div>
    </footer>
  );
}
