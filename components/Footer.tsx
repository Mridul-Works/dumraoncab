import Link from "next/link";
import { site, services, routes } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="bg-night text-paper">
      <div className="taxi-stripe" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-2 md:px-8 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white font-display text-lg font-extrabold text-night">
              DC
            </span>
            <span className="font-display text-lg font-extrabold">Dumraon Cab Service</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-sand">
            Chauffeur-driven cabs from Dumraon since {site.foundedYear}. {" "}
            {site.stats[1].value} vehicles, verified drivers, fixed fares — anywhere in Bihar, any hour.
          </p>
          <p className="mt-4">
            <span className="plate">{site.phoneDisplay}</span>
          </p>
        </div>

        <div>
          <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-amber">Services</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {services.map((s) => (
              <li key={s.slug}>
                <Link href={`/services/${s.slug}`} className="text-paper/80 transition-colors hover:text-amber">
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-amber">Popular routes</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {routes.map((r) => (
              <li key={r.slug}>
                <Link href={`/routes/${r.slug}`} className="text-paper/80 transition-colors hover:text-amber">
                  {r.from} → {r.to}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/fleet" className="text-paper/80 transition-colors hover:text-amber">
                Our fleet
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-amber">Reach us</h3>
          <address className="mt-4 space-y-2.5 text-sm not-italic text-paper/80">
            <p>
              {site.address.locality}, {site.address.district} district,
              <br />
              {site.address.region} — {site.address.postalCode}
            </p>
            <p>
              <a href={`tel:${site.phone}`} className="hover:text-amber">{site.phoneDisplay}</a>
              {site.altPhones.map((p) => (
                <span key={p.raw}>
                  {" · "}
                  <a href={`tel:${p.raw}`} className="hover:text-amber">{p.display}</a>
                </span>
              ))}
            </p>
            <p>
              <a href={`mailto:${site.email}`} className="hover:text-amber">{site.email}</a>
            </p>
            <p className="font-mono text-xs uppercase tracking-widest text-leaf">Open 24 hours · 7 days</p>
          </address>
        </div>
      </div>

      <div className="border-t border-linedark">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-sand md:flex-row md:items-center md:justify-between md:px-8">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p>Serving {site.serviceAreas.slice(0, -1).join(" · ")}</p>
        </div>
      </div>
    </footer>
  );
}
