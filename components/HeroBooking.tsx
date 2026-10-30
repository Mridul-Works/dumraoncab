"use client";

import { useState } from "react";
import type { PublicRoute, Vehicle } from "@/lib/catalog";
import { site, waLink } from "@/lib/site";

const tabs = ["Outstation", "Hourly", "Airport", "One-Way", "Wedding", "Corporate"] as const;
type TabKey = (typeof tabs)[number];

const toLabel: Record<TabKey, string> = {
  Outstation: "To",
  Hourly: "Package",
  Airport: "To",
  "One-Way": "To",
  Wedding: "Venue / city",
  Corporate: "City / site",
};

const toPlaceholder: Record<TabKey, string> = {
  Outstation: "e.g. Patna",
  Hourly: "",
  Airport: "Patna Airport",
  "One-Way": "Drop city",
  Wedding: "Wedding venue",
  Corporate: "Office / site location",
};

const fieldCls =
  "w-full rounded-[10px] border border-subtle bg-white px-3 py-2.5 text-[15px] text-primary placeholder:text-helper transition-colors focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15";
const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-helper";

type Props = { vehicles: Vehicle[]; routes: PublicRoute[]; packages: string[] };

export default function HeroBooking({ vehicles: fleet, routes, packages }: Props) {
  const [tab, setTab] = useState<TabKey>("Outstation");
  const [tripType, setTripType] = useState<"One Way" | "Round Trip">("Round Trip");
  const [sent, setSent] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    // Record the request for the admin panel; WhatsApp remains the confirmation channel.
    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        source: "hero-widget",
        service: `${tab}${tab === "Outstation" ? ` (${tripType})` : ""}`,
        from: d.get("from"),
        to: d.get("to"),
        date: d.get("date"),
        time: d.get("time"),
        car: d.get("car"),
      }),
    }).catch(() => {});
    const lines = [
      `*Booking request — dumraoncab.com*`,
      `Service: ${tab}${tab === "Outstation" ? ` (${tripType})` : ""}`,
      `From: ${d.get("from")}`,
      `${toLabel[tab]}: ${d.get("to")}`,
      `Date: ${d.get("date")}${d.get("time") ? `  Time: ${d.get("time")}` : ""}`,
      `Car: ${d.get("car")}`,
    ];
    window.open(waLink(lines.join("\n")), "_blank", "noopener,noreferrer");
    setSent(true);
  }

  return (
    <section className="overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 pb-10 pt-10 md:px-8 md:pt-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          {/* Copy */}
          <div>
            <p className="flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-brand">
              <span className="h-0.5 w-6 rounded-full bg-gold" aria-hidden="true" />
              Bihar&rsquo;s trusted cab service · Since {site.foundedYear}
            </p>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[4rem]">
              <span className="block text-primary">Go anywhere.</span>
              <span className="block font-medium text-secondary">We&rsquo;ll handle the road.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-secondary md:text-lg">
              From local rides in Dumraon to long-distance journeys across Bihar and beyond — find
              the right car for wherever life takes you.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {[
                ["Verified drivers", "M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z M9 12l2 2 4-4"],
                ["24/7 available", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3.5 2"],
                ["Fixed fares", "M4 4h7l9 9-7 7-9-9z M8.5 8.5h.01"],
              ].map(([label, d]) => (
                <span key={label} className="flex items-center gap-2 text-sm font-medium text-secondary">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand" aria-hidden="true">
                    {d.split(" M").map((p, i) => (
                      <path key={i} d={(i === 0 ? "" : "M") + p} />
                    ))}
                  </svg>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Illustrated road scene */}
          <div className="relative overflow-hidden rounded-[22px] shadow-card">
            <svg viewBox="0 0 640 460" role="img" aria-label="Illustration of an open road through green fields toward Patna" className="h-auto w-full">
              <defs>
                <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fdf3dc" /><stop offset=".65" stopColor="#f7e7c3" /><stop offset="1" stopColor="#f0ddb4" />
                </linearGradient>
                <linearGradient id="field1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#9dbd8a" /><stop offset="1" stopColor="#84a973" />
                </linearGradient>
                <linearGradient id="field2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#77a066" /><stop offset="1" stopColor="#5f8a52" />
                </linearGradient>
              </defs>
              <rect width="640" height="220" fill="url(#sky)" />
              <circle cx="500" cy="120" r="46" fill="#f2b95c" opacity=".9" />
              <circle cx="500" cy="120" r="70" fill="#f2b95c" opacity=".18" />
              <path d="M0 205 Q80 190 160 200 T340 198 T520 202 T640 197 L640 225 L0 225 Z" fill="#6f9660" opacity=".5" />
              <path d="M0 215 L640 215 L640 320 L0 320 Z" fill="url(#field1)" />
              <path d="M0 300 L640 300 L640 460 L0 460 Z" fill="url(#field2)" />
              <g fill="#4e7a43">
                <ellipse cx="90" cy="196" rx="26" ry="20" /><rect x="87" y="205" width="6" height="16" rx="2" fill="#5c5040" />
                <ellipse cx="585" cy="192" rx="30" ry="22" /><rect x="582" y="203" width="6" height="18" rx="2" fill="#5c5040" />
                <ellipse cx="205" cy="205" rx="16" ry="12" />
              </g>
              <path d="M320 215 L300 215 L150 460 L400 460 Z" fill="#38433c" />
              <path className="road-dash" d="M309 218 L274 460" stroke="#faf9f4" strokeWidth="5" fill="none" strokeDasharray="18 26" strokeLinecap="round" />
              <g className="hero-cab">
                <ellipse cx="290" cy="392" rx="52" ry="8" fill="#1f2a24" opacity=".25" />
                <rect x="248" y="330" width="84" height="58" rx="14" fill="#fdfdfb" />
                <rect x="256" y="316" width="68" height="34" rx="12" fill="#fdfdfb" />
                <rect x="264" y="322" width="52" height="22" rx="8" fill="#2e3833" />
                <rect x="270" y="308" width="40" height="12" rx="5" fill="#e9a23b" />
                <rect x="252" y="360" width="16" height="9" rx="4" fill="#d9534a" />
                <rect x="312" y="360" width="16" height="9" rx="4" fill="#d9534a" />
                <rect x="266" y="374" width="48" height="11" rx="3" fill="#e8e4d8" />
                <rect x="250" y="384" width="18" height="10" rx="4" fill="#232a26" />
                <rect x="312" y="384" width="18" height="10" rx="4" fill="#232a26" />
              </g>
              <g>
                <rect x="428" y="330" width="52" height="44" rx="8" fill="#f6f4ec" stroke="#c9c2ae" />
                <rect x="428" y="358" width="52" height="16" rx="6" fill="#e9a23b" />
                <rect x="448" y="374" width="12" height="26" fill="#c9c2ae" />
                <text x="454" y="349" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="12" fontWeight="600" fill="#38433c">PATNA</text>
                <text x="454" y="370" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="#5c5040">120 km</text>
              </g>
              <g stroke="#5c5040" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".6">
                <path d="M180 80 q6 -7 12 0 q6 -7 12 0" />
                <path d="M230 60 q5 -6 10 0 q5 -6 10 0" />
              </g>
            </svg>
            <div className="absolute bottom-4 left-4 rounded-xl border border-black/5 bg-white/95 px-4 py-3 shadow-lg">
              <div className="flex items-center gap-2 font-mono text-xs font-medium tracking-wide">
                <b className="text-brand">DUM</b>
                <svg width="30" height="8" viewBox="0 0 30 8" aria-hidden="true">
                  <path d="M0 4 H26 M22 1 L27 4 L22 7" stroke="#8a948d" fill="none" strokeWidth="1.4" />
                </svg>
                <b className="text-brand">PAT</b>
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-helper">NH-922 · ~120 km · ~3 hr</div>
              <div className="rc-line mt-2" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Booking card */}
        <form
          onSubmit={handleSubmit}
          className="mt-10 rounded-[18px] border border-black/5 bg-white p-5 shadow-card [animation:rise_.45s_ease-out] md:p-6"
        >
          {/* Service segments */}
          <div
            className="inline-flex max-w-full flex-wrap gap-0.5 rounded-xl bg-brand-subtle p-1"
            role="tablist"
            aria-label="Service type"
          >
            {tabs.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`rounded-[9px] px-3.5 py-2 text-sm transition-all sm:px-4 ${
                  tab === key
                    ? "bg-white font-semibold text-primary shadow-[0_1px_4px_rgb(24_36_32/0.12)]"
                    : "font-medium text-secondary hover:text-primary"
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          {tab === "Outstation" && (
            <div className="mt-4 flex gap-2" role="radiogroup" aria-label="Trip type">
              {(["Round Trip", "One Way"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={tripType === t}
                  onClick={() => setTripType(t)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                    tripType === t ? "bg-brand text-white" : "border border-subtle text-secondary hover:border-brand hover:text-brand"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Fields */}
          <div className="mt-4 grid items-end gap-2.5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
            <div>
              <label htmlFor="hb-from" className={labelCls}>From</label>
              <input id="hb-from" name="from" required defaultValue="Dumraon" placeholder="Pickup point" className={fieldCls} />
            </div>
            <div>
              <label htmlFor="hb-to" className={labelCls}>{toLabel[tab]}</label>
              {tab === "Hourly" ? (
                <select id="hb-to" name="to" className={fieldCls}>
                  {packages.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              ) : (
                <input
                  id="hb-to"
                  name="to"
                  required
                  key={tab}
                  defaultValue={tab === "Airport" ? "Patna Airport" : ""}
                  placeholder={toPlaceholder[tab]}
                  className={fieldCls}
                />
              )}
            </div>
            <div>
              <label htmlFor="hb-date" className={labelCls}>Date</label>
              <input id="hb-date" name="date" type="date" required min={today} className={fieldCls} />
            </div>
            <div>
              <label htmlFor="hb-time" className={labelCls}>Time</label>
              <input id="hb-time" name="time" type="time" className={fieldCls} />
            </div>
            <div>
              <label htmlFor="hb-car" className={labelCls}>Car</label>
              <select id="hb-car" name="car" defaultValue="Any — suggest for me" className={fieldCls}>
                <option>Any — suggest for me</option>
                {fleet
                  .filter((v) => v.category !== "Utility")
                  .map((v) => (
                    <option key={v.name}>{v.name}</option>
                  ))}
              </select>
            </div>
            <button
              type="submit"
              className="group rounded-xl bg-brand px-6 py-[11px] text-[15px] font-semibold whitespace-nowrap text-white transition-colors hover:bg-brand-hover sm:col-span-2 lg:col-span-1"
            >
              Get fare on WhatsApp{" "}
              <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </button>
          </div>

          {/* Popular drops */}
          {tab !== "Hourly" && tab !== "Corporate" && (
            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-helper">Popular:</span>
              {routes.map((r) => (
                <button
                  key={r.slug}
                  type="button"
                  onClick={(e) => {
                    const form = e.currentTarget.closest("form");
                    const to = form?.querySelector<HTMLInputElement>('input[name="to"]');
                    if (to) to.value = r.to;
                  }}
                  className="shrink-0 whitespace-nowrap rounded-full border border-subtle bg-white px-3.5 py-1.5 text-xs font-medium text-secondary transition-colors hover:border-brand hover:text-brand"
                >
                  {r.to}
                  <span className="ml-1.5 font-mono text-[10px] text-helper">from {r.fareFrom}</span>
                </button>
              ))}
            </div>
          )}

          <p className="mt-4 flex items-center gap-2 text-xs text-helper">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand" aria-hidden="true">
              <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" />
            </svg>
            Transparent pricing · No hidden charges · Free cancellation up to 2 hours before pickup
          </p>

          {sent && (
            <p className="mt-3 rounded-xl bg-selected px-4 py-3 text-sm text-primary" role="status">
              Your request opened in WhatsApp — press send there for a fixed quote. Nothing happened?
              Call{" "}
              <a href={`tel:${site.phone}`} className="font-mono font-semibold text-brand">
                {site.phoneDisplay}
              </a>
              .
            </p>
          )}
        </form>

        <p className="mt-5 text-center text-sm text-secondary">
          Prefer to talk?{" "}
          <a href={`tel:${site.phone}`} className="font-mono font-semibold text-brand hover:underline">
            Call {site.phoneDisplay}
          </a>{" "}
          — a person answers 24/7.
        </p>
      </div>
    </section>
  );
}
