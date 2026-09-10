"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/lib/site";

const nav = [
  { href: "/services", label: "Services" },
  { href: "/routes", label: "Outstation" },
  { href: "/fleet", label: "Fleet" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Support" },
];

function CarMark() {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-amber">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 16 L5 12 Q5 10 7 10 L17 10 Q19 10 19 12 L19 16" />
        <path d="M7 10 L8.5 6.5 Q9 5.5 10 5.5 L14 5.5 Q15 5.5 15.5 6.5 L17 10" />
        <circle cx="8" cy="16.5" r="1.6" />
        <circle cx="16" cy="16.5" r="1.6" />
      </svg>
    </span>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-ink/5 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:gap-6 md:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" onClick={() => setOpen(false)}>
          <CarMark />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-sm font-semibold tracking-tight text-ink sm:text-base">
              Dumraon Cab
            </span>
            <span className="hidden font-mono text-[9px] uppercase tracking-[0.18em] text-khaki sm:block">
              Buxar · Bihar · Since 2014
            </span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Main">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-ink/5 hover:text-ink ${
                pathname.startsWith(item.href) ? "text-amber" : "text-khaki"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3 lg:ml-4">
          <a
            href={`tel:${site.phone}`}
            className="hidden items-center gap-2 text-sm font-medium text-khaki transition-colors hover:text-amber md:flex"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 5 Q4 4 5 4 L8 4 L9.5 8 L7.5 9.5 Q9 13 12.5 14.5 L14 12.5 L18 14 L18 17 Q18 18 17 18 Q4 17 4 5 Z" />
            </svg>
            {site.phoneDisplay}
          </a>
          <Link
            href="/booking"
            className="rounded-xl bg-amber px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-white transition-colors hover:bg-amberdeep sm:px-5 sm:py-2.5 sm:text-sm"
          >
            Book a Ride
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-line text-ink md:size-10 lg:hidden"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              {open ? (
                <>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </>
              ) : (
                <>
                  <line x1="4" y1="8" x2="20" y2="8" />
                  <line x1="4" y1="16" x2="20" y2="16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav
          className="mx-3 mb-3 flex flex-col rounded-2xl border border-line bg-white p-2 shadow-lg lg:hidden"
          aria-label="Mobile"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3 text-base font-medium text-ink hover:bg-cream"
            >
              {item.label}
            </Link>
          ))}
          <a href={`tel:${site.phone}`} className="rounded-xl px-4 py-3 text-base font-semibold text-amber">
            Call {site.phoneDisplay} — 24/7
          </a>
        </nav>
      )}
    </header>
  );
}
