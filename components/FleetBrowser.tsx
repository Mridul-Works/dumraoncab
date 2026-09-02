"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { fleet, waLink } from "@/lib/site";

const filters = ["All cars", "SUV", "MUV", "Compact SUV", "Hatchback", "Utility"] as const;

export default function FleetBrowser() {
  const [active, setActive] = useState<(typeof filters)[number]>("All cars");
  const track = useRef<HTMLDivElement>(null);

  const visible = active === "All cars" ? fleet : fleet.filter((v) => v.category === active);

  function scroll(dir: 1 | -1) {
    track.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  }

  return (
    <div>
      {/* Category filters */}
      <div className="flex flex-wrap items-center justify-center gap-2.5" role="group" aria-label="Filter cars by category">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={active === f}
            onClick={() => setActive(f)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              active === f
                ? "bg-night text-paper"
                : "border border-line bg-white text-ink hover:border-amber hover:text-amberdeep"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Carousel controls (desktop) */}
      <div className="mt-8 hidden justify-end gap-2 md:flex">
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label="Scroll to previous cars"
          className="grid size-10 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:border-amber hover:text-amberdeep"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label="Scroll to next cars"
          className="grid size-10 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:border-amber hover:text-amberdeep"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>

      {/* Car cards */}
      <div
        ref={track}
        className="mt-4 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 md:mt-3"
        style={{ scrollbarWidth: "thin" }}
      >
        {visible.map((v) => (
          <a
            key={v.name}
            href={waLink(`Hello Dumraon Cab Service, I want to book the ${v.name} (${v.category}). Please share availability and fare.`)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Book the ${v.name} on WhatsApp`}
            className="group w-[280px] flex-none snap-start overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-amber hover:shadow-lg hover:shadow-amber/10 sm:w-[300px]"
          >
            <div className="relative aspect-[4/3] bg-cream">
              <Image
                src={v.image}
                alt={`${v.name} — ${v.category} in the Dumraon Cab Service fleet`}
                fill
                sizes="300px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              />
              <span className="absolute bottom-3 right-3 rounded-lg bg-night/90 px-2.5 py-1.5 font-mono text-xs font-semibold text-paper">
                {v.rate === "On request" ? "On request" : `${v.rate}`}
              </span>
            </div>

            <div className="p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-lg font-extrabold tracking-tight text-ink">{v.name}</h3>
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-khaki">{v.category}</span>
              </div>
              <p className="mt-2 text-sm text-khaki">
                {v.transmission} <span className="text-sand">·</span> {v.fuel} <span className="text-sand">·</span> {v.seats}
              </p>
              <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-khaki">{v.note}</p>
            </div>

            <div className="flex items-center gap-2 border-t border-amber/30 bg-gradient-to-r from-amber/10 to-amber/25 px-4 py-2.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amberdeep" aria-hidden="true">
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span className="text-sm font-semibold text-ink">Verified · Own fleet</span>
              <span className="ml-auto text-sm font-bold text-amberdeep transition-transform group-hover:translate-x-0.5">
                Book →
              </span>
            </div>
          </a>
        ))}
      </div>

      <p className="mt-4 text-center text-sm text-khaki">
        Every car above is our own, garaged in Dumraon — cleaned before pickup, comprehensively insured
        and driven by a police-verified chauffeur.
      </p>
    </div>
  );
}
