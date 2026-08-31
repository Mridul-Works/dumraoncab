"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { site, waLink, defaultWaText } from "@/lib/site";

const nav = [
  { href: "/services", label: "Services" },
  { href: "/fleet", label: "Our Fleet" },
  { href: "/booking", label: "Fares & Booking" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="grid size-10 place-items-center rounded-xl bg-night font-display text-lg font-extrabold text-white">
            DC
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base font-extrabold tracking-tight text-ink">
              Dumraon Cab Service
            </span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-khaki">
              Since 2014 · Buxar, Bihar
            </span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-6 lg:flex" aria-label="Main">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-semibold transition-colors hover:text-amberdeep ${
                pathname.startsWith(item.href) ? "text-amberdeep" : "text-khaki"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:ml-6">
          <a
            href={`tel:${site.phone}`}
            className="hidden items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-sm font-semibold text-ink transition-colors hover:border-amber hover:text-amberdeep sm:flex"
          >
            <PhoneIcon />
            {site.phoneDisplay}
          </a>
          <a
            href={waLink(defaultWaText)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-night px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-coal"
          >
            Book on WhatsApp
          </a>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-10 place-items-center rounded-full border border-line text-ink lg:hidden"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <MenuIcon open={open} />
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-line bg-white px-5 pb-5 pt-2 lg:hidden" aria-label="Mobile">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block border-b border-line py-3 text-base font-semibold text-ink hover:text-amberdeep"
            >
              {item.label}
            </Link>
          ))}
          <a href={`tel:${site.phone}`} className="mt-4 block font-mono text-sm font-semibold text-amberdeep">
            Call {site.phoneDisplay} — 24/7
          </a>
        </nav>
      )}
    </header>
  );
}

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {open ? (
        <>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </>
      ) : (
        <>
          <path d="M3 6h18" />
          <path d="M3 12h18" />
          <path d="M3 18h18" />
        </>
      )}
    </svg>
  );
}
