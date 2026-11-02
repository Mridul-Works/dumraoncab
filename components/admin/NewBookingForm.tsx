"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBooking } from "@/app/admin/actions";
import Icon from "@/components/admin/Icon";
import {
  Box,
  Card,
  Chip,
  Fact,
  FieldError,
  Label,
  Segmented,
  Stepper,
  SummaryRow,
  Toggle,
  bareInput,
  type CarClassOption,
  type CarOption,
  type CustomerInfo,
  type PlaceOption,
  type RouteOption,
  type ServiceOption,
  type VendorCarOption,
} from "@/components/admin/NewBookingParts";
import { addDays, clock, day, fromMin, hoursWords, norm, phoneShow, toMin } from "@/components/admin/newbooking/format";
import { CarPicker, Highlight, OtherDate, SuggestField, TimeField, nextHalfHour, type CarChoice } from "@/components/admin/newbooking/Pickers";
import { FormError, StatusBadge, btnGhost, btnPrimary, btnText } from "@/components/admin/ui";
import { inr } from "@/lib/catalogTypes";
import { customerConfirmText, customerQuoteText } from "@/lib/site";

// New booking (Figma "Flow 3B"): a trip that came in by phone, WhatsApp or at
// the desk. Left: the form in cards. Right: a live summary with the fare, the
// problems to fix, and Save. Work in progress is kept as a draft in this browser.
// Dropdowns (3B.8–3B.13): past-customer lookup on the mobile number, pickup and
// drop suggestions, the pickup-time list, the Other-date calendar and the car picker.

type Channel = "phone" | "whatsapp" | "walk-in";
type Payment = "Cash" | "UPI" | "Monthly bill";
const DRAFT_KEY = "admin:new-booking-draft";
const ANY = "any";

const blank = (today: string) => ({
  channel: "phone" as Channel,
  phone: "", // digits only, max 10
  name: "",
  direction: "one" as "one" | "round",
  service: "", // service slug
  from: "",
  to: "",
  date: today,
  time: "", // "HH:MM"
  flight: "",
  people: 1,
  bags: 0,
  carClass: "", // fare class id, "any", or ""
  carId: "",
  vendorCar: "", // "<vendorId>:<carId>" when a vendor's car is assigned
  notes: "",
  adminNote: "",
  fare: "", // route fare override; "" = use the suggestion
  discount: "",
  payment: "Cash" as Payment,
  status: "confirmed" as "confirmed" | "new",
  wa: true,
});
type Draft = ReturnType<typeof blank>;

export default function NewBookingForm({
  customers,
  services,
  routes,
  pickups,
  drops,
  classes,
  cars,
  vendorCars,
  busy,
  nightAllowance,
  today,
  startedAt,
}: {
  customers: CustomerInfo[];
  services: ServiceOption[];
  routes: RouteOption[];
  pickups: PlaceOption[];
  drops: PlaceOption[];
  classes: CarClassOption[];
  cars: CarOption[];
  vendorCars: VendorCarOption[];
  busy: Record<string, string[]>; // date → car ids (and "<vendorId>:<carId>") already promised
  nightAllowance: number;
  today: string;
  startedAt: string; // "HH:MM" IST, when the form was opened
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createBooking, undefined);
  const [f, setF] = useState<Draft>(() => blank(today));
  const [showErrors, setShowErrors] = useState(false);
  const [draftAt, setDraftAt] = useState("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((p) => ({ ...p, [k]: v }));
  const text = (k: "name" | "from" | "to" | "flight" | "notes" | "adminNote") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    set(k, e.target.value);

  /* ---- draft: restore once, then save on every change ---- */
  const restored = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const { f: saved, at } = JSON.parse(raw) as { f: Partial<Draft>; at: string };
        // A draft for a past day keeps everything but the date.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from browser storage
        setF((p) => ({ ...p, ...saved, date: saved.date && saved.date >= today ? saved.date : today }));
        setDraftAt(at);
      }
    } catch {}
    restored.current = true;
  }, [today]);
  const pristine = !f.phone && !f.from && !f.to && !f.name;
  useEffect(() => {
    if (!restored.current) return;
    const t = setTimeout(() => {
      try {
        if (pristine) {
          localStorage.removeItem(DRAFT_KEY);
          return;
        }
        const now = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(11, 16);
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ f, at: now }));
        setDraftAt(now);
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [f, pristine]);
  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
  };

  /* ---- derived ---- */
  const customer = f.phone.length === 10 ? customers.find((c) => c.digits === f.phone) : undefined;
  const service = services.find((s) => s.slug === f.service);
  const hourly = f.service === "hourly-rental";
  const route = f.to ? routes.find((r) => norm(f.to).startsWith(norm(r.to))) : undefined;
  const cls = classes.find((c) => c.id === f.carClass);
  const car = cars.find((c) => c.id === f.carId);
  const vendorCar = vendorCars.find((v) => v.key === f.vendorCar);

  /* ---- car picker (Figma 3B.13) ---- */
  const carWhen = f.date === today ? "today" : day(f.date, { weekday: "long" });
  const freeOurs = cars.filter((c) => (!cls || cls.carIds.includes(c.id)) && !busy[f.date]?.includes(c.id));
  const classWord = cls ? norm(cls.name.split(" /")[0]) : "";
  const freeVendor = freeOurs.length
    ? []
    : vendorCars.filter((v) => (!cls || norm(cls.name).includes(norm(v.type)) || norm(v.type).includes(classWord)) && v.seats >= f.people && !busy[f.date]?.includes(v.key));
  const carChoices: CarChoice[] = [
    ...freeOurs.map((c) => ({
      key: c.id,
      title: c.number ? `${c.name} · ${c.number}` : c.name,
      sub: `${classes.find((x) => x.id === c.fareClass)?.name ?? "Car"} · free all ${carWhen}`,
    })),
    ...freeVendor.map((v) => ({ key: `v:${v.key}`, title: v.number ? `${v.model} · ${v.number}` : v.model, sub: `${v.vendor} · vendor car` })),
  ];

  /* ---- suggestions (Figma 3B.8–3B.10) ---- */
  // Past customers whose number holds what's typed so far (from 3 digits).
  const lookup =
    f.phone.length >= 3
      ? customers
          .filter((c) => c.digits.includes(f.phone))
          .sort((a, b) => Number(b.digits.startsWith(f.phone)) - Number(a.digits.startsWith(f.phone)) || b.trips - a.trips)
          .slice(0, 4)
      : [];
  // Three most used pickups — a past customer's own first; typing filters them.
  const fromQ = f.from.trim().toLowerCase();
  const pickupPool = [...new Set([...(customer?.places ?? []), ...pickups.map((p) => p.name)])];
  const pickupSuggestions = fromQ
    ? pickupPool.filter((p) => p.toLowerCase().includes(fromQ) && p.toLowerCase() !== fromQ).slice(0, 5)
    : pickupPool.slice(0, 3);
  // Drop: fixed-fare routes, then past drops, matching the start of any word.
  const toQ = f.to.trim().toLowerCase();
  const wordStart = (name: string) => toQ && (name.toLowerCase().startsWith(toQ) || name.toLowerCase().includes(` ${toQ}`) || name.toLowerCase().includes(`(${toQ}`));
  const dropSuggestions = toQ
    ? [...routes.map((r) => ({ name: r.to, route: r as RouteOption | undefined })), ...drops.map((d) => ({ name: d.name, route: undefined }))]
        .filter((d) => wordStart(d.name) && d.name.toLowerCase() !== toQ)
        .slice(0, 5)
    : [];
  const trips = f.direction === "round" ? 2 : 1;
  const km = route ? route.km * trips : 0;
  const suggested = route ? Math.max(route.fare * trips, cls ? km * cls.rate : 0) : 0;
  const routeFare = f.fare !== "" ? Number(f.fare) || 0 : suggested;
  const discount = Math.min(Number(f.discount) || 0, routeFare);
  const total = routeFare - discount;
  const eta = route && f.time ? fromMin(toMin(f.time) + route.minutes) : "";
  const flightAt = (() => {
    const m = f.flight.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
    if (!m) return "";
    let h = Number(m[1]) % 12;
    if (m[3]?.toLowerCase() === "pm" || (!m[3] && Number(m[1]) >= 12)) h += 12;
    return fromMin(h * 60 + Number(m[2]));
  })();
  const freeOn = (ids: string[], date: string) => ids.filter((id) => !busy[date]?.includes(id)).length;
  const dayWord = (d: string) => (d === today ? "today" : day(d, { weekday: "short" }));
  const strip = Array.from({ length: 6 }, (_, i) => addDays(today, i));

  // Days on which every one of our cars is already promised (faded in the calendar).
  const fullDays = new Set(cars.length ? Object.keys(busy).filter((d) => cars.every((c) => busy[d].includes(c.id))) : []);

  /* ---- validation (Figma 3B.3) ---- */
  const errors: { key: string; label: string; msg: string }[] = [];
  if (f.channel !== "walk-in" && !f.phone) errors.push({ key: "nb-phone", label: "Mobile number", msg: "Add a 10-digit mobile number" });
  else if (f.phone && f.phone.length !== 10) errors.push({ key: "nb-phone", label: "Mobile number", msg: "Enter all 10 digits" });
  if (!f.service) errors.push({ key: "nb-service", label: "Trip type", msg: "Choose a trip type" });
  if (!f.from.trim()) errors.push({ key: "nb-from", label: "Pickup", msg: "Add a pickup point" });
  if (!f.to.trim() && !hourly) errors.push({ key: "nb-to", label: "Drop", msg: "Add a drop point" });
  if (!f.time) errors.push({ key: "nb-time", label: "Pickup time", msg: "Pick a time to save" });
  const err = (key: string) => (showErrors ? errors.find((e) => e.key === key)?.msg : undefined);

  const classLabel = cls?.name ?? (f.carClass === ANY ? "Any car" : "");
  const waText = () => {
    const trip = {
      name: f.name,
      service: service?.name ?? "trip",
      from: f.from,
      to: f.to,
      date: f.date ? day(f.date, { weekday: "short", day: "numeric", month: "short" }) : "",
      time: f.time ? clock(f.time) : "",
      car: car?.name ?? vendorCar?.model ?? classLabel,
      quote: total || undefined,
    };
    return f.status === "confirmed" ? customerConfirmText(trip) : customerQuoteText(trip);
  };

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (errors.length) {
      e.preventDefault();
      setShowErrors(true);
      document.getElementById(errors[0].key)?.focus();
      return;
    }
    // Opened from the click, so pop-up blockers allow it; staff press send.
    if (f.wa && f.phone.length === 10) window.open(`https://wa.me/91${f.phone}?text=${encodeURIComponent(waText())}`, "_blank", "noopener");
    clearDraft();
  }

  const channelLabel = { phone: "Phone call", whatsapp: "WhatsApp", "walk-in": "Walk-in" }[f.channel];

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {/* ---- header ---- */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <Link href="/admin/bookings" className="inline-flex items-center gap-1.5 type-ui text-link hover:text-link-hover">
            <Icon name="arrow-left" size={16} />
            Bookings
          </Link>
          <h1 className="mt-1 type-h2 text-primary">New booking</h1>
        </div>
        <p className="type-body-sm text-secondary">{draftAt && !pristine ? `Draft saved ${clock(draftAt)}` : `${channelLabel} · started ${clock(startedAt)}`}</p>
        <button
          type="button"
          className={btnGhost}
          onClick={() => {
            clearDraft();
            router.push("/admin/bookings");
          }}
        >
          Discard
        </button>
      </div>

      {/* Values the server action reads */}
      <input type="hidden" name="channel" value={f.channel} />
      <input type="hidden" name="phone" value={f.phone} />
      <input type="hidden" name="service" value={service?.name ?? ""} />
      <input type="hidden" name="direction" value={f.direction} />
      <input type="hidden" name="date" value={f.date} />
      <input type="hidden" name="time" value={f.time} />
      <input type="hidden" name="people" value={f.people} />
      <input type="hidden" name="bags" value={f.bags} />
      <input type="hidden" name="carClass" value={classLabel} />
      <input type="hidden" name="carId" value={f.carId} />
      <input type="hidden" name="vendorId" value={f.vendorCar.split(":")[0] ?? ""} />
      <input type="hidden" name="vendorCarId" value={f.vendorCar.split(":")[1] ?? ""} />
      <input type="hidden" name="quote" value={total || ""} />
      <input type="hidden" name="payment" value={f.payment} />
      <input type="hidden" name="status" value={f.status} />
      <input type="hidden" name="wa" value={f.wa && f.phone.length === 10 ? "1" : "0"} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_372px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* ---- Customer ---- */}
          <Card
            title="Customer"
            extra={
              <Segmented<Channel>
                label="How the booking came in"
                value={f.channel}
                onChange={(v) => set("channel", v)}
                options={[
                  { value: "phone", label: "Phone call" },
                  { value: "whatsapp", label: "WhatsApp" },
                  { value: "walk-in", label: "Walk-in" },
                ]}
              />
            }
          >
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nb-phone" optional={f.channel === "walk-in"}>
                  Mobile number
                </Label>
                {/* Figma 3B.8: typing the number finds past customers; one tap fills the rest. */}
                <SuggestField
                  id="nb-phone"
                  placeholder="10-digit mobile"
                  value={phoneShow(f.phone)}
                  error={!!err("nb-phone")}
                  inputProps={{ type: "tel", inputMode: "numeric", "aria-describedby": "nb-phone-msg" }}
                  prefix={
                    <>
                      <span className="type-body-md text-secondary">+91</span>
                      <span className="h-5.5 w-px bg-gray-200" />
                    </>
                  }
                  trailing={
                    err("nb-phone") ? (
                      <Icon name="warning-circle" size={20} className="text-[var(--support-error)]" />
                    ) : f.phone.length === 10 ? (
                      <Icon name="check" size={20} className="text-brand" />
                    ) : null
                  }
                  onChange={(v) => {
                    let d = v.replace(/\D/g, "");
                    if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
                    set("phone", d.slice(0, 10));
                  }}
                  menuClassName="left-0 w-full sm:w-[520px] sm:max-w-[calc(100vw-2rem)]"
                  items={lookup.map((c) => ({
                    key: c.digits,
                    icon: "user",
                    title: c.name || `+91 ${phoneShow(c.digits)}`,
                    sub: [
                      f.phone.length < 10 && c.name ? `+91 ${phoneShow(c.digits)}` : "",
                      `${c.trips} trip${c.trips === 1 ? "" : "s"}`,
                      c.usualPickup ? `usually ${c.usualPickup}${c.usualDrop ? ` to ${c.usualDrop}` : ""}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · "),
                  }))}
                  onPick={(digits) => {
                    const c = customers.find((x) => x.digits === digits);
                    if (!c) return;
                    setF((p) => ({
                      ...p,
                      phone: c.digits,
                      name: p.name || c.name,
                      from: p.from || c.usualPickup,
                      to: p.to || c.usualDrop,
                      payment: (["Cash", "UPI", "Monthly bill"] as const).find((x) => x === c.payment) ?? p.payment,
                    }));
                  }}
                />
                {err("nb-phone") ? (
                  <FieldError id="nb-phone-msg">{err("nb-phone")}</FieldError>
                ) : (
                  !f.phone && (
                    <p id="nb-phone-msg" className="type-body-sm text-secondary">
                      Start here. We look up past bookings.
                    </p>
                  )
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nb-name">Name</Label>
                <Box icon="user">
                  <input id="nb-name" name="name" placeholder="Customer name" value={f.name} onChange={text("name")} className={bareInput} />
                </Box>
              </div>
            </div>
            {customer && (
              <div className="flex flex-wrap items-center gap-3 rounded-md bg-gray-50 px-3.5 py-3 sm:flex-nowrap">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-gray-200 bg-layer text-[var(--icon-secondary)]">
                  <Icon name="user" size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="type-ui text-primary">
                    Returning customer · {customer.trips} trip{customer.trips === 1 ? "" : "s"} since {day(customer.since, { month: "long" })}
                  </p>
                  <p className="type-body-sm text-secondary">
                    Last: {customer.last.date ? `${day(customer.last.date, { day: "numeric", month: "short" })}, ` : ""}
                    {customer.last.from}
                    {customer.last.to ? ` → ${customer.last.to}` : ""}
                    {customer.last.car ? `, ${customer.last.car}` : ""}
                    {customer.payment ? ` · paid by ${customer.payment}` : ""}
                    {customer.usualPickup ? ` · usual pickup ${customer.usualPickup}` : ""}
                  </p>
                </div>
                <Link href={`/admin/bookings?q=${customer.digits}`} className={`${btnText} px-5 py-2.5`}>
                  History
                </Link>
              </div>
            )}
          </Card>

          {/* ---- Trip ---- */}
          <Card
            title="Trip"
            extra={
              <Segmented<"one" | "round">
                label="Direction"
                value={f.direction}
                onChange={(v) => set("direction", v)}
                options={[
                  { value: "one", label: "One way" },
                  { value: "round", label: "Round trip" },
                ]}
              />
            }
          >
            <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
              <div id="nb-service" tabIndex={-1} className={`rounded-md ${err("nb-service") ? "ring-2 ring-[var(--support-error)]" : ""}`}>
                <Segmented<string>
                  label="Trip type"
                  full
                  className="min-w-[620px]"
                  value={f.service}
                  onChange={(v) => set("service", v)}
                  options={services.map((s) => ({ value: s.slug, label: s.label, icon: s.icon }))}
                />
              </div>
            </div>
            <FieldError id="nb-service-msg">{err("nb-service")}</FieldError>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Label htmlFor="nb-from" tag={customer && f.from && f.from === customer.usualPickup ? "Usual" : undefined}>
                  Pickup
                </Label>
                {/* Figma 3B.9: three most used pickups (a past customer sees their own), plus drop a pin. */}
                <SuggestField
                  id="nb-from"
                  icon="map-pin"
                  placeholder="Village, street or landmark"
                  value={f.from}
                  error={!!err("nb-from")}
                  inputProps={{ name: "from" }}
                  onChange={(v) => set("from", v)}
                  openOnFocus
                  menuClassName="left-0 w-full sm:w-[420px] sm:max-w-[calc(100vw-2rem)]"
                  items={pickupSuggestions.map((name) => ({ key: name, icon: "map-pin", title: name }))}
                  onPick={(name) => set("from", name)}
                  footer={
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.from.trim() || "Dumraon, Bihar")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3.5 pb-1.5 pt-2.5 type-ui text-link transition-colors hover:text-link-hover"
                    >
                      <Icon name="map-pin" size={16} />
                      Drop a pin on the map
                    </a>
                  }
                />
                <FieldError id="nb-from-msg">{err("nb-from")}</FieldError>
              </div>
              <button
                type="button"
                aria-label="Swap pickup and drop"
                title="Swap pickup and drop"
                onClick={() => setF((p) => ({ ...p, from: p.to, to: p.from }))}
                className="grid size-12 shrink-0 place-items-center self-center rounded-full border border-gray-200 bg-layer text-[var(--icon-secondary)] transition-colors hover:bg-layer-hover sm:mt-[26px] sm:self-start"
              >
                <Icon name="arrow-right" size={18} className="rotate-90 sm:rotate-0" />
              </button>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Label htmlFor="nb-to" optional={hourly}>
                  Drop
                </Label>
                {/* Figma 3B.10: closest matches with km and fare; picking one fills the summary. */}
                <SuggestField
                  id="nb-to"
                  icon="map-pin"
                  placeholder="Type or pick a popular place"
                  value={f.to}
                  error={!!err("nb-to")}
                  inputProps={{ name: "to" }}
                  onChange={(v) => set("to", v)}
                  menuClassName="left-0 w-full sm:w-[460px] sm:max-w-[calc(100vw-2rem)]"
                  items={dropSuggestions.map((d) => ({
                    key: d.name,
                    icon: "map-pin",
                    title: <Highlight text={d.name} query={f.to.trim()} />,
                    meta: d.route ? `${d.route.km} km · ${inr(d.route.fare)}` : undefined,
                  }))}
                  onPick={(name) => {
                    const r = routes.find((x) => x.to === name);
                    setF((p) => ({ ...p, to: name, from: r ? p.from || r.from : p.from, fare: "" }));
                  }}
                />
                <FieldError id="nb-to-msg">{err("nb-to")}</FieldError>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="type-body-sm text-secondary">Popular</span>
              {routes.map((r) => (
                <Chip
                  key={r.slug}
                  on={route?.slug === r.slug}
                  meta={inr(r.fare)}
                  onClick={() => setF((p) => ({ ...p, to: r.to, from: p.from || r.from, fare: "" }))}
                >
                  {r.to}
                </Chip>
              ))}
            </div>
          </Card>

          {/* ---- Date and time ---- */}
          <Card
            title="Date and time"
            aside={f.date ? `${day(f.date, { weekday: "short", day: "numeric", month: "short" })}${f.time ? `, ${clock(f.time)}` : ""}` : undefined}
          >
            <div className="relative grid grid-cols-4 gap-2 sm:grid-cols-7">
              {strip.map((d, i) => {
                const on = f.date === d;
                const top = i === 0 ? "Today" : i === 1 ? "Tomorrow" : day(d, { weekday: "short" });
                const bottom = i < 2 ? day(d, { weekday: "short" }) : day(d, { month: "short" });
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set("date", d)}
                    className={`flex min-w-0 flex-col items-center rounded-md border py-2.5 transition-colors ${
                      on ? "border-transparent bg-brand text-on-color" : "border-gray-200 bg-layer hover:bg-layer-hover"
                    }`}
                  >
                    <span className={`truncate type-body-sm ${on ? "" : "text-secondary"}`}>{top}</span>
                    <span className={`type-h3 ${on ? "" : "text-primary"}`}>{day(d, { day: "numeric" })}</span>
                    <span className={`type-body-sm ${on ? "" : "text-secondary"}`}>{bottom}</span>
                  </button>
                );
              })}
              <OtherDate value={f.date} inStrip={strip.includes(f.date)} min={today} fullDays={fullDays} onChange={(d) => set("date", d)} />
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nb-time">Pickup time</Label>
                {/* Figma 3B.11: 15-minute list around the usual slot; typing a time also works. */}
                <TimeField id="nb-time" value={f.time} onChange={(t) => set("time", t)} around={customer?.usualTime || nextHalfHour(startedAt)} error={!!err("nb-time")} />
                <FieldError id="nb-time-msg">{err("nb-time")}</FieldError>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nb-flight" optional>
                Flight or train number
              </Label>
              <Box>
                <input id="nb-flight" name="flight" placeholder="For airport and station trips" value={f.flight} onChange={text("flight")} className={bareInput} />
              </Box>
            </div>

            {route && (
              <p className="flex items-start gap-2.5 type-body-sm text-secondary">
                <Icon name="path" size={18} className="mt-px text-brand" />
                <span>
                  {eta ? `Reaches ${route.to} around ${clock(eta)} · ` : ""}
                  {route.km} km · about {hoursWords(route.minutes)}
                  {eta && flightAt && toMin(flightAt) > toMin(eta)
                    ? ` · ${hoursWords(toMin(flightAt) - toMin(eta))} before the ${f.service === "airport-transfers" && /airport/i.test(route.to) ? "flight" : "departure"}`
                    : ""}
                </span>
              </p>
            )}
          </Card>

          {/* ---- Car and people ---- */}
          <Card title="Car and people">
            <div className="flex flex-col gap-3.5 sm:flex-row">
              <Stepper label="Passengers" hint="Adults and children" value={f.people} min={1} max={60} onChange={(n) => set("people", n)} />
              <Stepper label="Bags" hint="Large suitcases" value={f.bags} min={0} max={30} onChange={(n) => set("bags", n)} />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[...classes, null].map((c) => {
                const id = c?.id ?? ANY;
                const on = f.carClass === id;
                const free = c ? freeOn(c.carIds, f.date) : 0;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setF((p) => ({
                        ...p,
                        carClass: id,
                        carId: c && p.carId && !c.carIds.includes(p.carId) ? "" : p.carId,
                        vendorCar: "",
                        fare: "",
                      }))
                    }
                    className={`flex min-w-0 flex-col items-start gap-1.5 rounded-md bg-layer px-4 py-3.5 text-left transition-colors ${
                      on ? "border-2 border-brand px-[15px] py-[13px]" : "border border-gray-200 hover:bg-layer-hover"
                    }`}
                  >
                    <span className="flex w-full items-center gap-2">
                      <Icon name="car-simple" size={22} className={on ? "text-brand" : "text-[var(--icon-secondary)]"} />
                      <span className="flex-1" />
                      {on && (
                        <span className="grid size-5 place-items-center rounded-full bg-brand text-on-color">
                          <Icon name="check" size={12} />
                        </span>
                      )}
                    </span>
                    <span className="type-ui text-primary">{c?.name ?? "Any car"}</span>
                    <span className="type-body-sm text-secondary">{c ? `${c.seats ? `${c.seats} seats · ` : ""}${inr(c.rate)}/km` : "Best free one"}</span>
                    <span className={`flex items-center gap-1.5 type-body-sm ${c && free > 0 ? "text-brand" : "text-secondary"}`}>
                      <Icon name="dot" size={6} className={c && free > 0 ? "" : "text-gray-200"} />
                      {c ? (free > 0 ? `${free} free ${dayWord(f.date) === "today" ? "today" : `on ${dayWord(f.date)}`}` : "None free") : "We choose"}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nb-car" optional>
                Assign a car
              </Label>
              {/* Figma 3B.13: only free cars of the picked type; vendor cars when none of ours are free. */}
              <CarPicker
                id="nb-car"
                label={car ? `${car.name} · ${busy[f.date]?.includes(car.id) ? "booked" : "free all"} ${carWhen}` : vendorCar ? `${vendorCar.model} · ${vendorCar.vendor}` : "Decide later"}
                value={f.carId || (f.vendorCar ? `v:${f.vendorCar}` : "")}
                choices={carChoices}
                empty={`No ${cls ? `${cls.name} ` : ""}car free ${carWhen === "today" ? "today" : `on ${carWhen}`}`}
                onChange={(key) => {
                  if (key.startsWith("v:")) return setF((p) => ({ ...p, carId: "", vendorCar: key.slice(2) }));
                  const home = classes.find((c) => c.carIds.includes(key));
                  setF((p) => ({ ...p, carId: key, vendorCar: "", carClass: key && home && p.carClass !== home.id ? home.id : p.carClass }));
                }}
              />
            </div>
          </Card>

          {/* ---- Notes ---- */}
          <Card title="Notes">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nb-notes">For the driver</Label>
                <textarea
                  id="nb-notes"
                  name="notes"
                  rows={3}
                  maxLength={400}
                  placeholder="Landmark, call before arriving, luggage…"
                  value={f.notes}
                  onChange={text("notes")}
                  className="h-22 w-full resize-none rounded-md border border-gray-200 bg-layer px-3.5 pt-3 type-body-md text-primary placeholder:text-secondary focus:border-focus focus:outline-none focus:ring-1 focus:ring-focus focus-visible:outline-none!"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nb-admin" optional>
                  Internal
                </Label>
                <textarea
                  id="nb-admin"
                  name="adminNote"
                  rows={3}
                  maxLength={800}
                  placeholder="Only staff see this"
                  value={f.adminNote}
                  onChange={text("adminNote")}
                  className="h-22 w-full resize-none rounded-md border border-gray-200 bg-layer px-3.5 pt-3 type-body-md text-primary placeholder:text-secondary focus:border-focus focus:outline-none focus:ring-1 focus:ring-focus focus-visible:outline-none!"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* ---- Summary ---- */}
        <aside className="flex flex-col gap-4.5 rounded-lg border border-gray-100 bg-layer px-4 pb-6 pt-5.5 sm:px-6 lg:sticky lg:top-6">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 type-h4 text-primary">Summary</h2>
            {!pristine && (
              <button
                type="button"
                onClick={() => set("status", f.status === "confirmed" ? "new" : "confirmed")}
                title={f.status === "confirmed" ? "Saving as confirmed. Click to save as New (needs a call back)." : "Saving as New. Click to save as confirmed."}
                className="rounded-full"
              >
                <StatusBadge status={f.status} />
              </button>
            )}
          </div>

          {showErrors && errors.length > 0 && (
            <div role="alert" className="flex items-start gap-2.5 rounded-md bg-tag-red px-3.5 py-3 text-error">
              <Icon name="warning-circle" size={20} />
              <div className="min-w-0 flex-1">
                <p className="type-ui">
                  {errors.length} thing{errors.length === 1 ? "" : "s"} to fix
                </p>
                <p className="type-body-sm">{errors.map((e) => e.label).join(" · ")}</p>
              </div>
            </div>
          )}

          {/* Route view */}
          <div className="flex gap-3.5">
            <div className="flex flex-col items-center pt-1">
              <span className={`size-3 rounded-full ${f.from ? "bg-brand" : "bg-gray-200"}`} />
              <span className="w-0.5 flex-1 bg-gray-200" />
              <span className={`size-3 rounded-full border-2 bg-layer ${f.to ? "border-brand" : "border-gray-200"}`} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-5">
              <div>
                <p className="type-body-sm text-secondary">
                  {f.time ? `${clock(f.time)} · ${day(f.date, { weekday: "short", day: "numeric", month: "short" })}` : "Pickup"}
                </p>
                <p className={`type-ui ${f.from ? "text-primary" : "text-secondary"}`}>{f.from || "Not added yet"}</p>
              </div>
              <div>
                <p className="type-body-sm text-secondary">{eta ? `about ${clock(eta)}` : "Drop"}</p>
                <p className={`type-ui ${f.to ? "text-primary" : "text-secondary"}`}>{route?.to ?? (f.to || (hourly ? "Local, by the hour" : "Not added yet"))}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Fact icon="path">{km ? `${km} km` : "– km"}</Fact>
            <Fact icon="users">
              {f.people} {f.people === 1 ? "person" : "people"}
            </Fact>
            <Fact icon="car-simple">{car?.name ?? vendorCar?.model ?? (classLabel || "No car yet")}</Fact>
          </div>

          <hr className="border-gray-100" />

          <div className="flex flex-col gap-2.5">
            <SummaryRow label={`Route fare${cls ? ` · ${cls.name.split(" /")[0]}` : ""}`}>
              <span className="inline-flex items-center">
                {(f.fare !== "" || suggested > 0) && "₹"}
                <input
                  aria-label="Route fare in rupees"
                  inputMode="numeric"
                  placeholder="–"
                  value={f.fare !== "" ? f.fare : suggested ? suggested.toLocaleString("en-IN") : ""}
                  onChange={(e) => set("fare", e.target.value.replace(/\D/g, "").slice(0, 7))}
                  className="min-w-3 max-w-24 rounded-sm bg-transparent text-right type-ui text-primary [field-sizing:content] placeholder:text-primary hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus-visible:outline-none!"
                />
              </span>
            </SummaryRow>
            {(routeFare > 0 || f.direction === "round") && (
              <SummaryRow label="Night allowance">{f.direction === "round" ? `${inr(nightAllowance)}/night if overnight` : "Not needed"}</SummaryRow>
            )}
            <SummaryRow label="Tolls and parking">At actuals</SummaryRow>
            {routeFare > 0 && (
              <SummaryRow label="Discount">
                <span className="inline-flex items-center text-link">
                  –&nbsp;₹
                  <input
                    aria-label="Discount in rupees"
                    inputMode="numeric"
                    placeholder="0"
                    value={f.discount}
                    onChange={(e) => set("discount", e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="min-w-2 max-w-16 rounded-sm bg-transparent text-right type-ui text-link [field-sizing:content] placeholder:text-link hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus-visible:outline-none!"
                  />
                </span>
              </SummaryRow>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="flex-1 type-ui text-primary">Total</span>
            <span className={`type-h1 ${total ? "text-primary" : "text-secondary"}`}>{total ? inr(total) : "₹ –"}</span>
          </div>

          <div className="flex flex-col gap-2">
            <p className="type-ui text-primary">Payment</p>
            <Segmented<Payment>
              label="Payment"
              full
              value={f.payment}
              onChange={(v) => set("payment", v)}
              options={[
                { value: "Cash", label: "Cash" },
                { value: "UPI", label: "UPI" },
                { value: "Monthly bill", label: "Monthly bill" },
              ]}
            />
          </div>

          <div className="flex items-center gap-2.5">
            <Toggle on={f.wa} onChange={(v) => set("wa", v)} label={f.status === "confirmed" ? "Send confirmation on WhatsApp" : "Send quote on WhatsApp"} />
            <span className="flex-1 type-body-sm text-primary">{f.status === "confirmed" ? "Send confirmation on WhatsApp" : "Send quote on WhatsApp"}</span>
            <Icon name="whatsapp-logo" size={18} className="text-brand" />
          </div>

          <FormError error={state?.error} />

          <div className="flex flex-col gap-2">
            <button type="submit" name="then" value="list" disabled={pristine || pending} className={`${btnPrimary} w-full py-3.5`}>
              <Icon name="check" size={16} />
              {pending ? "Saving…" : "Save booking"}
            </button>
            <button type="submit" name="then" value="another" disabled={pristine || pending} className={`${btnText} justify-center px-5 py-2.5 disabled:opacity-40`}>
              Save and add another
            </button>
          </div>

          <p className="type-body-sm text-secondary">
            {pristine
              ? "Add a mobile number, pickup, drop and time to save."
              : f.payment === "Monthly bill"
                ? "Added to the customer's monthly bill."
                : "Customer pays at the end of the trip."}
          </p>
        </aside>
      </div>
    </form>
  );
}
