"use client";

import { useState } from "react";
import { fleet, services, site, waLink } from "@/lib/site";

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-sand focus:border-amber";
const labelCls = "mb-1.5 block text-sm font-semibold text-ink";

// No backend needed: the form composes a structured WhatsApp message — the channel
// this business actually confirms bookings on. Swap handleSubmit for an API call later.
export default function BookingForm() {
  const [sent, setSent] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    // Record the request for the admin panel; WhatsApp remains the confirmation channel.
    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        source: "booking-form",
        service: data.get("service"),
        name: data.get("name"),
        phone: data.get("phone"),
        from: data.get("pickup"),
        to: data.get("drop"),
        date: data.get("date"),
        time: data.get("time"),
        car: data.get("car"),
        notes: data.get("notes"),
      }),
    }).catch(() => {});
    const lines = [
      "*New booking request — dumraoncab.com*",
      `Name: ${data.get("name")}`,
      `Phone: ${data.get("phone")}`,
      `Service: ${data.get("service")}`,
      `Car: ${data.get("car")}`,
      `Pickup: ${data.get("pickup")}`,
      `Drop / destination: ${data.get("drop") || "—"}`,
      `Date: ${data.get("date")}  Time: ${data.get("time") || "—"}`,
      data.get("notes") ? `Notes: ${data.get("notes")}` : "",
    ].filter(Boolean);
    window.open(waLink(lines.join("\n")), "_blank", "noopener,noreferrer");
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-white p-6 shadow-sm md:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="bf-name" className={labelCls}>Your name</label>
          <input id="bf-name" name="name" required autoComplete="name" placeholder="Full name" className={inputCls} />
        </div>
        <div>
          <label htmlFor="bf-phone" className={labelCls}>Phone number</label>
          <input
            id="bf-phone"
            name="phone"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            pattern="[0-9+ ]{10,15}"
            placeholder="10-digit mobile number"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="bf-service" className={labelCls}>Service</label>
          <select id="bf-service" name="service" className={inputCls} defaultValue={services[0].name}>
            {services.map((s) => (
              <option key={s.slug} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bf-car" className={labelCls}>Preferred car</label>
          <select id="bf-car" name="car" className={inputCls} defaultValue="Any — suggest for me">
            <option>Any — suggest for me</option>
            {fleet.filter((v) => v.category !== "Utility").map((v) => (
              <option key={v.name} value={`${v.name} (${v.category})`}>
                {v.name} · {v.seats}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bf-pickup" className={labelCls}>Pickup location</label>
          <input id="bf-pickup" name="pickup" required placeholder="e.g. Dumraon, near new bus stand" className={inputCls} />
        </div>
        <div>
          <label htmlFor="bf-drop" className={labelCls}>Drop / destination <span className="font-normal text-khaki">(optional)</span></label>
          <input id="bf-drop" name="drop" placeholder="e.g. Patna Airport" className={inputCls} />
        </div>
        <div>
          <label htmlFor="bf-date" className={labelCls}>Travel date</label>
          <input id="bf-date" name="date" required type="date" min={today} className={inputCls} />
        </div>
        <div>
          <label htmlFor="bf-time" className={labelCls}>Pickup time <span className="font-normal text-khaki">(optional)</span></label>
          <input id="bf-time" name="time" type="time" className={inputCls} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="bf-notes" className={labelCls}>Anything else? <span className="font-normal text-khaki">(optional)</span></label>
          <textarea
            id="bf-notes"
            name="notes"
            rows={3}
            placeholder="Luggage, number of passengers, wedding decoration, round trip…"
            className={inputCls}
          />
        </div>
      </div>

      <button
        type="submit"
        className="mt-6 w-full rounded-full bg-amberdeep px-7 py-3.5 text-base font-bold text-white transition-colors hover:bg-night md:w-auto"
      >
        Send request on WhatsApp
      </button>

      {sent && (
        <p className="mt-4 rounded-lg bg-cream px-4 py-3 text-sm text-ink" role="status">
          Your request opened in WhatsApp — press send there and we&rsquo;ll reply with a fixed quote.
          Nothing happened? Call us directly at{" "}
          <a href={`tel:${site.phone}`} className="font-semibold text-amberdeep">{site.phoneDisplay}</a>.
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-khaki">
        Sends a pre-filled WhatsApp message to {site.phoneDisplay} — no account or payment needed.
        We reply with a fixed quote, usually within minutes.
      </p>
    </form>
  );
}
