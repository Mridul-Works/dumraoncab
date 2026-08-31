"use client";

import { useState } from "react";
import Image from "next/image";
import { fleet, routes, site, waLink } from "@/lib/site";

const tabs = [
  { key: "Outstation", label: "Outstation", icon: RoadIcon },
  { key: "Hourly", label: "Hourly", icon: ClockIcon },
  { key: "Airport", label: "Airport", icon: PlaneIcon },
  { key: "One-Way", label: "One-Way", icon: ArrowIcon },
  { key: "Wedding", label: "Wedding", icon: RingsIcon },
  { key: "Corporate", label: "Corporate", icon: CaseIcon },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const packages = ["4 hr / 40 km", "8 hr / 80 km", "12 hr / 120 km", "24 hr / 250 km"];

const toLabel: Record<TabKey, string> = {
  Outstation: "To",
  Hourly: "Package",
  Airport: "To",
  "One-Way": "To",
  Wedding: "Venue / city",
  Corporate: "City / site",
};

const toPlaceholder: Record<TabKey, string> = {
  Outstation: "Destination city",
  Hourly: "",
  Airport: "Patna Airport",
  "One-Way": "Drop city",
  Wedding: "Wedding venue",
  Corporate: "Office / site location",
};

export default function HeroBooking() {
  const [tab, setTab] = useState<TabKey>("Outstation");
  const [tripType, setTripType] = useState<"One Way" | "Round Trip">("Round Trip");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const lines = [
      `*Booking request — dumraoncab.com*`,
      `Service: ${tab}${tab === "Outstation" ? ` (${tripType})` : ""}`,
      `From: ${d.get("from")}`,
      `${toLabel[tab]}: ${d.get("to")}`,
      `Date: ${d.get("date")}${d.get("time") ? `  Time: ${d.get("time")}` : ""}`,
      `Car: ${d.get("car")}`,
    ];
    window.open(waLink(lines.join("\n")), "_blank", "noopener,noreferrer");
  }

  return (
    <section className="relative bg-night">
      {/* Backdrop — their own Scorpio, not a stock photo */}
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src={fleet[0].image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-night/85 via-night/70 to-night/90" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-12 md:px-8 md:pt-14">
        <h1 className="text-center font-display text-[26px] font-extrabold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
          Anywhere in Bihar. <span className="whitespace-nowrap text-amber">Any hour.</span>
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-white/80 md:text-base">
          Chauffeur-driven cabs from Dumraon since {site.foundedYear} — fixed fares, verified drivers, 24/7.
        </p>

        {/* Booking card */}
        <form onSubmit={handleSubmit} className="relative mt-6 rounded-2xl bg-white pb-5 shadow-2xl md:mt-8 md:pb-10">
          {/* Service tabs */}
          <div
            className="flex justify-start overflow-x-auto border-b border-line px-2 [-ms-overflow-style:none] [scrollbar-width:none] md:justify-center [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Service type"
          >
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`relative flex min-w-20 flex-col items-center gap-1.5 px-4 pb-3 pt-4 text-xs font-bold whitespace-nowrap transition-colors ${
                  tab === key ? "text-amberdeep" : "text-khaki hover:text-ink"
                }`}
              >
                <Icon active={tab === key} />
                {label}
                {tab === key && (
                  <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-amberdeep" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>

          <div className="px-4 pt-4 md:px-6">
            {/* Trip type (outstation only) */}
            {tab === "Outstation" && (
              <div className="mb-4 flex gap-2" role="radiogroup" aria-label="Trip type">
                {(["Round Trip", "One Way"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={tripType === t}
                    onClick={() => setTripType(t)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                      tripType === t ? "bg-night text-white" : "border border-line text-khaki hover:border-amber"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* Field row */}
            <div className="grid overflow-hidden rounded-xl border border-line sm:grid-cols-2 lg:grid-cols-5">
              <Cell label="From">
                <input
                  name="from"
                  required
                  defaultValue="Dumraon"
                  placeholder="Pickup point"
                  className="w-full bg-transparent font-display text-xl font-extrabold text-ink placeholder:text-sand focus:outline-none"
                />
              </Cell>

              <Cell label={toLabel[tab]}>
                {tab === "Hourly" ? (
                  <select
                    name="to"
                    className="w-full bg-transparent font-display text-xl font-extrabold text-ink focus:outline-none"
                  >
                    {packages.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    name="to"
                    required
                    key={tab}
                    defaultValue={tab === "Airport" ? "Patna Airport" : ""}
                    placeholder={toPlaceholder[tab]}
                    className="w-full bg-transparent font-display text-xl font-extrabold text-ink placeholder:text-sand focus:outline-none"
                  />
                )}
              </Cell>

              <Cell label="Date">
                <input
                  name="date"
                  type="date"
                  required
                  className="w-full bg-transparent font-display text-lg font-extrabold text-ink focus:outline-none"
                />
              </Cell>

              <Cell label="Pickup time">
                <input
                  name="time"
                  type="time"
                  className="w-full bg-transparent font-display text-lg font-extrabold text-ink focus:outline-none"
                />
              </Cell>

              <Cell label="Car" last>
                <select
                  name="car"
                  defaultValue="Any — suggest for me"
                  className="w-full bg-transparent font-display text-lg font-extrabold text-ink focus:outline-none"
                >
                  <option>Any — suggest for me</option>
                  {fleet
                    .filter((v) => v.category !== "Utility")
                    .map((v) => (
                      <option key={v.name}>{v.name}</option>
                    ))}
                </select>
              </Cell>
            </div>

            {/* Popular drops */}
            {tab !== "Hourly" && tab !== "Corporate" && (
              <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
                <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-khaki">Popular:</span>
                {routes.map((r) => (
                  <button
                    key={r.slug}
                    type="button"
                    onClick={(e) => {
                      const form = e.currentTarget.closest("form");
                      const to = form?.querySelector<HTMLInputElement>('input[name="to"]');
                      if (to) to.value = r.to;
                    }}
                    className="shrink-0 whitespace-nowrap rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-amber hover:text-amberdeep"
                  >
                    {r.to}
                    <span className="ml-1.5 font-mono text-[10px] text-khaki">from {r.fareFrom}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CTA — full-width inside the card on mobile, overlapping pill from md up */}
          <button
            type="submit"
            className="mx-4 mt-5 block w-[calc(100%-2rem)] rounded-full bg-gradient-to-r from-amberdeep to-amber px-6 py-3.5 text-base font-extrabold tracking-wide text-white shadow-xl shadow-amberdeep/30 transition-transform hover:-translate-y-0.5 md:absolute md:-bottom-6 md:left-1/2 md:mx-0 md:mt-0 md:w-auto md:-translate-x-1/2 md:px-16 md:text-lg"
          >
            GET FARE ON WHATSAPP
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-white/85 md:mt-12">
          Prefer to talk?{" "}
          <a href={`tel:${site.phone}`} className="font-mono font-bold text-amber hover:underline">
            Call {site.phoneDisplay}
          </a>{" "}
          — a person answers 24/7.
        </p>
      </div>
    </section>
  );
}

function Cell({ label, children, last = false }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <label className={`block border-b border-line p-4 lg:border-b-0 ${last ? "" : "sm:border-r lg:border-r"}`}>
      <span className="block text-[11px] font-bold uppercase tracking-wider text-khaki">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

/* --- tab icons --- */
function iconCls(active: boolean) {
  return active ? "text-amberdeep" : "text-khaki";
}
function RoadIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconCls(active)} aria-hidden="true">
      <path d="M4 20 8 4h8l4 16" /><path d="M12 7v2m0 4v2m0 4v1" />
    </svg>
  );
}
function ClockIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconCls(active)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
    </svg>
  );
}
function PlaneIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconCls(active)} aria-hidden="true">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}
function ArrowIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconCls(active)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M8 12h8m-3-3 3 3-3 3" />
    </svg>
  );
}
function RingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconCls(active)} aria-hidden="true">
      <circle cx="9" cy="14" r="5" /><circle cx="15" cy="14" r="5" /><path d="m9 6 1.5-2h3L15 6" />
    </svg>
  );
}
function CaseIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconCls(active)} aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-12 5h18" />
    </svg>
  );
}
