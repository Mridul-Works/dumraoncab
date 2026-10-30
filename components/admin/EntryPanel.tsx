"use client";

import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeEntry, saveEntry } from "@/app/admin/journal-actions";
import Drawer from "@/components/admin/Drawer";
import Icon from "@/components/admin/Icon";
import { time12 } from "@/components/admin/JournalFormat";
import { FormError, btnDanger, btnGhost, btnPrimary } from "@/components/admin/ui";
import { inr, type CarType } from "@/lib/catalogTypes";
import type { JournalRecord } from "@/lib/journal";

// "New journal entry" slide-over (Figma 4C.1–4C.6): date chips, customer and
// route (typed, or picked from a booking), car accordion with search, money,
// note, and a live net-for-this-trip footer.

export type BookingOption = {
  id: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  from: string;
  to: string;
  carId: string;
  quote: number;
};
export type CarOption = { id: string; name: string; number: string; type: CarType };
export type BusyCar = { carId: string; date: string; label: string };

const num = (s: string) => Number(s.replace(/[,\s₹]/g, "")) || 0;
const digits = (s: string) => s.replace(/\D/g, "");
const fmtPhone = (p: string) => (p.length === 10 ? `${p.slice(0, 5)} ${p.slice(5)}` : p);
const dayMonth = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const shift = (d: string, days: number) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
};
// The accordion groups SUV and MUV together, as in the design.
const GROUPS: { label: string; types: CarType[] }[] = [
  { label: "SUV / MUV", types: ["SUV", "MUV"] },
  { label: "Compact SUV", types: ["Compact SUV"] },
  { label: "Hatchback", types: ["Hatchback"] },
  { label: "Utility", types: ["Utility"] },
];

// Figma "Box": 44px field with an optional leading icon.
const boxCls = (invalid = false) =>
  `flex h-11 min-w-0 items-center gap-2.5 rounded-md bg-layer px-3 focus-within:ring-2 focus-within:ring-focus/20 ${
    invalid ? "border-2 border-[var(--support-error)]" : "border border-gray-200 focus-within:border-focus"
  }`;
const bareInput = "min-w-0 flex-1 bg-transparent type-body-md text-primary placeholder:text-secondary focus:outline-none";
const sectionHead = "flex items-center gap-2";
// The box draws the focus ring; the global :focus-visible outline is unlayered,
// so it can only be switched off inline.
const noOutline = { outline: "none" } as const;
const grouped = (s: string) => (s === "" ? "" : Number(s).toLocaleString("en-IN"));
const linkBtn = "inline-flex items-center gap-1.5 type-body-sm text-link hover:text-link-hover";

function Radio({ on }: { on: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element -- static two-colour design asset
  if (on) return <img src="/admin-icons/radio-checked.svg" alt="" width={20} height={20} className="size-5 shrink-0" />;
  return <span aria-hidden="true" className="size-5 shrink-0 rounded-full border-[1.5px] border-gray-200 bg-layer" />;
}

export default function EntryPanel({
  entry,
  prefillBookingId,
  prefillDate,
  cars,
  bookings,
  busy,
  today,
  baseTown,
  returnTo,
  defaultCarId,
}: {
  entry?: JournalRecord;
  prefillBookingId?: string;
  prefillDate?: string;
  cars: CarOption[];
  bookings: BookingOption[];
  busy: BusyCar[];
  today: string;
  baseTown: string;
  returnTo: string;
  defaultCarId?: string;
}) {
  const router = useRouter();
  const [state, action, saving] = useActionState(saveEntry, undefined);
  const [deleting, startDelete] = useTransition();
  const otherDate = useRef<HTMLInputElement>(null);

  const initialBooking = bookings.find((b) => b.id === (entry?.bookingId ?? prefillBookingId));
  const roundInit = Boolean(entry?.roundTrip);
  const [f, setF] = useState(() => ({
    bookingId: initialBooking?.id ?? "",
    date: entry?.date ?? initialBooking?.date ?? prefillDate ?? today,
    customer: entry?.customer ?? initialBooking?.name ?? "",
    phone: entry?.phone ?? (initialBooking ? digits(initialBooking.phone).slice(-10) : ""),
    from: entry?.from ?? initialBooking?.from ?? baseTown,
    to: entry?.to ?? initialBooking?.to ?? "",
    roundTrip: roundInit,
    // One-way distance as typed; a round trip stores twice this.
    km: entry?.km != null ? String(roundInit ? Math.round(entry.km / 2) : entry.km) : "",
    carId: entry?.carId ?? (initialBooking?.carId || defaultCarId || ""),
    fare: entry ? String(entry.fare) : initialBooking?.quote ? String(initialBooking.quote) : "",
    fuel: entry && entry.fuel ? String(entry.fuel) : "",
    driverCut: entry && entry.driverCut ? String(entry.driverCut) : "",
    note: entry?.note ?? "",
  }));
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((prev) => ({ ...prev, [k]: e.target.value }));
  const [mode, setMode] = useState<"manual" | "pick" | "linked">(initialBooking ? "linked" : "manual");
  const linked = mode === "linked" ? bookings.find((b) => b.id === f.bookingId) : undefined;

  function pickBooking(b: BookingOption) {
    setF((prev) => ({
      ...prev,
      bookingId: b.id,
      date: b.date || prev.date,
      customer: b.name,
      phone: digits(b.phone).slice(-10),
      from: b.from,
      to: b.to,
      carId: b.carId || prev.carId,
      fare: b.quote ? String(b.quote) : prev.fare,
    }));
    setMode("linked");
  }
  const unlink = () => {
    setF((prev) => ({ ...prev, bookingId: "" }));
    setMode("manual");
  };

  // Booking picker search
  const [bookingQuery, setBookingQuery] = useState("");
  const bookingHits = useMemo(() => {
    const q = bookingQuery.trim().toLowerCase();
    const qd = digits(q);
    return bookings
      .filter((b) => !q || `${b.name} ${b.from} ${b.to}`.toLowerCase().includes(q) || (qd.length >= 3 && digits(b.phone).includes(qd)))
      .slice(0, 8);
  }, [bookings, bookingQuery]);
  const whenLabel = (b: BookingOption) =>
    `${b.date === today ? "Today" : b.date === shift(today, -1) ? "Yesterday" : dayMonth(b.date)}${b.time ? ` ${time12(b.time)}` : ""}`;

  // Car accordion
  const busyLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of busy) if (x.date === f.date && !m.has(x.carId)) m.set(x.carId, x.label);
    return m;
  }, [busy, f.date]);
  const car = cars.find((c) => c.id === f.carId);
  const [carQuery, setCarQuery] = useState("");
  const [openGroup, setOpenGroup] = useState<string | null>(() => GROUPS.find((g) => car && g.types.includes(car.type))?.label ?? null);
  const groups = GROUPS.map((g) => ({ ...g, list: cars.filter((c) => g.types.includes(c.type)) })).filter((g) => g.list.length);
  const q = carQuery.trim().toLowerCase().replace(/\s/g, "");
  const carHits = q ? cars.filter((c) => `${c.name}${c.number}${c.type}`.toLowerCase().replace(/\s/g, "").includes(q)) : [];

  // Validation (shown after the first save attempt)
  const [tried, setTried] = useState(false);
  const problems = [!f.carId && "Car", f.fare.trim() === "" && "Fare"].filter(Boolean) as string[];
  const showErr = tried && problems.length > 0;
  const carErr = tried && !f.carId;
  const fareErr = tried && f.fare.trim() === "";

  const totalKm = num(f.km) * (f.roundTrip ? 2 : 1);
  const hasMoney = f.fare.trim() !== "" || f.fuel.trim() !== "" || f.driverCut.trim() !== "";
  const net = num(f.fare) - num(f.fuel) - num(f.driverCut);
  const pristine = !entry && !f.bookingId && !f.customer && !f.to && !f.carId && !hasMoney && !f.note;
  const close = () => router.push(returnTo, { scroll: false });

  const yesterday = shift(today, -1);
  const dateChoice = f.date === today ? "today" : f.date === yesterday ? "yesterday" : "other";
  const chip = (on: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full py-2 pl-3 pr-3.5 type-ui transition-colors ${
      on ? "bg-brand text-on-color" : "border border-gray-200 bg-layer text-primary hover:bg-layer-hover"
    }`;

  const MoneyField = ({ k, label, extra, invalid }: { k: "fare" | "fuel" | "driverCut"; label: string; extra?: React.ReactNode; invalid?: boolean }) => (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={`je-${k}`} className="flex items-center gap-2 type-body-sm text-secondary">
        {label}
        {extra}
      </label>
      <div className={boxCls(invalid)}>
        <span className="type-body-md text-secondary">₹</span>
        <input
          id={`je-${k}`}
          name={k}
          inputMode="numeric"
          placeholder="0"
          value={grouped(f[k])}
          onChange={(e) => setF((prev) => ({ ...prev, [k]: digits(e.target.value).slice(0, 7) }))}
          aria-invalid={invalid || undefined}
          className={bareInput} style={noOutline}
        />
      </div>
    </div>
  );

  return (
    <Drawer
      title={entry ? "Edit journal entry" : "New journal entry"}
      onClose={close}
      width="max-w-[520px]"
      footer={
        <>
          <div className="min-w-0 flex-1">
            {showErr ? (
              <>
                <p className="flex items-center gap-2 type-ui text-error">
                  <Icon name="warning-circle" size={18} />
                  {problems.length === 1 ? "1 thing to fix" : `${problems.length} things to fix`}
                </p>
                <p className="type-body-sm text-error">{problems.join(" · ")}</p>
              </>
            ) : (
              <>
                <p className="type-body-sm text-secondary">Net for this trip</p>
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className={`type-h3 tabular-nums ${hasMoney && net < 0 ? "text-error" : "text-brand"}`}>{hasMoney ? inr(net) : "₹ –"}</span>
                  <span className="type-body-sm text-secondary">
                    {!hasMoney ? "fill fare and costs" : totalKm > 0 && num(f.fare) > 0 ? `fare ₹${(num(f.fare) / totalKm).toFixed(1)} per km` : ""}
                  </span>
                </p>
              </>
            )}
          </div>
          {entry && (
            <button
              type="button"
              disabled={saving || deleting}
              onClick={() => {
                if (confirm("Delete this journal entry? This can't be undone.")) startDelete(() => removeEntry(entry.id, returnTo));
              }}
              className={btnDanger}
            >
              Delete
            </button>
          )}
          <button type="button" onClick={close} className={btnGhost}>
            Cancel
          </button>
          <button type="submit" form="entry-form" disabled={saving || deleting || pristine} className={btnPrimary}>
            <Icon name="check" size={16} />
            {saving ? "Saving…" : entry ? "Save changes" : "Save entry"}
          </button>
        </>
      }
    >
      <form
        id="entry-form"
        action={action}
        noValidate
        onSubmit={(e) => {
          setTried(true);
          if (problems.length) e.preventDefault();
        }}
        className="flex flex-col gap-[22px] px-5 py-6 md:px-7"
      >
        {entry && <input type="hidden" name="id" value={entry.id} />}
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="carId" value={f.carId} />
        <input type="hidden" name="bookingId" value={mode === "linked" ? f.bookingId : ""} />
        <input type="hidden" name="date" value={f.date} />
        <input type="hidden" name="roundTrip" value={f.roundTrip ? "1" : ""} />
        <input type="hidden" name="km" value={f.km.trim() === "" ? "" : String(totalKm)} />

        {/* Date */}
        <section className="flex flex-col gap-2.5">
          <p className="type-ui text-primary">Date</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={dateChoice === "today"} onClick={() => setF((p) => ({ ...p, date: today }))} className={chip(dateChoice === "today")}>
              {dateChoice === "today" && <Icon name="check" size={14} />}
              Today, {dayMonth(today)}
            </button>
            <button type="button" aria-pressed={dateChoice === "yesterday"} onClick={() => setF((p) => ({ ...p, date: yesterday }))} className={chip(dateChoice === "yesterday")}>
              {dateChoice === "yesterday" && <Icon name="check" size={14} />}
              Yesterday, {dayMonth(yesterday)}
            </button>
            <label className={`relative cursor-pointer ${chip(dateChoice === "other")}`}>
              <Icon name={dateChoice === "other" ? "check" : "calendar-blank"} size={14} />
              {dateChoice === "other" ? dayMonth(f.date) : "Other date"}
              <input
                ref={otherDate}
                type="date"
                max={today}
                value={f.date}
                aria-label="Other date"
                onClick={() => otherDate.current?.showPicker?.()}
                onChange={(e) => e.target.value && setF((p) => ({ ...p, date: e.target.value }))}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </section>

        {/* Customer and route */}
        <section className="flex flex-col gap-2.5">
          <div className={sectionHead}>
            <p className="flex-1 type-ui text-primary">Customer and route</p>
            {mode === "manual" && bookings.length > 0 && (
              <button type="button" onClick={() => setMode("pick")} className={linkBtn}>
                <Icon name="notebook" size={16} />
                Pick from a booking
              </button>
            )}
            {mode === "pick" && (
              <button type="button" onClick={() => setMode("manual")} className={linkBtn}>
                Enter manually
              </button>
            )}
            {mode === "linked" && (
              <button type="button" onClick={unlink} className={linkBtn}>
                Unlink
              </button>
            )}
          </div>

          {mode === "pick" && (
            <div className="overflow-hidden rounded-lg border-2 border-brand bg-layer">
              <label className="flex items-center gap-2.5 px-3.5 py-3 text-[var(--icon-secondary)]">
                <Icon name="magnifying-glass" size={18} />
                <input
                  autoFocus
                  value={bookingQuery}
                  onChange={(e) => setBookingQuery(e.target.value)}
                  placeholder="Search name, phone or place"
                  aria-label="Search bookings"
                  className={bareInput} style={noOutline}
                />
              </label>
              <p className="bg-gray-50 px-3.5 pb-1.5 pt-2 type-body-sm text-secondary">Recent trips not in the journal yet</p>
              {bookingHits.length === 0 && <p className="border-t border-gray-100 px-3.5 py-3 type-body-sm text-secondary">No booking matches “{bookingQuery}”.</p>}
              {bookingHits.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => pickBooking(b)}
                  className="flex w-full items-center gap-3 border-t border-gray-100 px-3.5 py-2.5 text-left hover:bg-hover focus-visible:bg-hover"
                >
                  <Icon name="notebook" size={18} className="text-[var(--icon-secondary)]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2">
                      <span className="type-ui text-primary">{b.name || "Unnamed"}</span>
                      {b.phone && <span className="type-mono-sm text-secondary">{fmtPhone(digits(b.phone).slice(-10))}</span>}
                    </span>
                    <span className="block truncate type-body-sm text-secondary">
                      {b.from} → {b.to || "—"}
                    </span>
                  </span>
                  <span className="shrink-0 type-body-sm text-secondary">{whenLabel(b)}</span>
                </button>
              ))}
            </div>
          )}

          {mode === "linked" && linked && (
            <div className="flex flex-col gap-2.5 rounded-lg bg-gray-50 px-4 py-3.5">
              <input type="hidden" name="customer" value={f.customer} />
              <input type="hidden" name="phone" value={f.phone} />
              <input type="hidden" name="from" value={f.from} />
              <input type="hidden" name="to" value={f.to} />
              <div className="flex items-center gap-2">
                <Icon name="notebook" size={18} className="text-[var(--icon-secondary)]" />
                <span className="flex-1 type-mono-sm text-secondary">Booking · {whenLabel(linked)}</span>
                <span className="rounded-full border border-brand bg-hover px-2 py-0.5 type-body-sm text-brand">Linked</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-2 type-ui text-primary">
                  <Icon name="user" size={18} className="text-[var(--icon-secondary)]" />
                  {f.customer || "Unnamed"}
                </span>
                {f.phone && (
                  <span className="flex items-center gap-2 type-body-md text-secondary">
                    <Icon name="phone" size={18} className="text-[var(--icon-secondary)]" />
                    +91 {fmtPhone(f.phone)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Icon name="path" size={18} className="text-[var(--icon-secondary)]" />
                <span className="type-ui text-primary">
                  {f.from} {f.to ? `to ${f.to}` : ""}
                  {f.roundTrip ? " and back" : ""}
                </span>
                {totalKm > 0 && <span className="type-body-md text-secondary">{totalKm} km</span>}
              </div>
            </div>
          )}

          {mode !== "linked" && mode !== "pick" && (
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label htmlFor="je-customer" className="type-body-sm text-secondary">
                  Customer name
                </label>
                <div className={boxCls()}>
                  <Icon name="user" size={18} className="text-[var(--icon-secondary)]" />
                  <input id="je-customer" name="customer" value={f.customer} onChange={set("customer")} placeholder="Customer name" maxLength={80} className={bareInput} style={noOutline} />
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label htmlFor="je-phone" className="type-body-sm text-secondary">
                  Mobile number
                </label>
                <div className={boxCls()}>
                  <span className="type-body-md text-secondary">+91</span>
                  <span aria-hidden="true" className="h-5 w-px bg-gray-200" />
                  <input
                    id="je-phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    value={fmtPhone(f.phone)}
                    onChange={(e) => setF((p) => ({ ...p, phone: digits(e.target.value).slice(0, 10) }))}
                    placeholder="10-digit mobile"
                    className={bareInput} style={noOutline}
                  />
                </div>
              </div>
            </div>
          )}

          {mode !== "pick" && (
            <>
              <div className="flex items-center gap-2 pt-1">
                <p className="flex-1 type-body-sm text-secondary">Route</p>
                <div role="group" aria-label="Trip type" className="flex gap-0.5 rounded-md border border-gray-200 bg-gray-50 p-[3px]">
                  {[
                    { on: !f.roundTrip, label: "One way", round: false },
                    { on: f.roundTrip, label: "Round trip", round: true },
                  ].map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      aria-pressed={o.on}
                      onClick={() => setF((p) => ({ ...p, roundTrip: o.round }))}
                      className={`rounded-sm px-2.5 py-1 type-body-sm ${o.on ? "border border-gray-200 bg-layer text-primary" : "border border-transparent text-secondary hover:text-primary"}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              {mode === "manual" && (
                <div className="flex items-center gap-2.5">
                  <div className={`${boxCls()} flex-1`}>
                    <Icon name="map-pin" size={18} className="text-[var(--icon-secondary)]" />
                    <input id="je-from" name="from" value={f.from} onChange={set("from")} aria-label="From" placeholder="From" className={bareInput} style={noOutline} />
                  </div>
                  <Icon name="arrow-right" size={18} className="text-[var(--icon-secondary)]" />
                  <div className={`${boxCls()} flex-1`}>
                    <Icon name="map-pin" size={18} className="text-[var(--icon-secondary)]" />
                    <input id="je-to" name="to" value={f.to} onChange={set("to")} aria-label="To" placeholder="Where to?" className={bareInput} style={noOutline} />
                    <input
                      id="je-km"
                      value={f.km}
                      onChange={(e) => setF((p) => ({ ...p, km: digits(e.target.value).slice(0, 4) }))}
                      inputMode="numeric"
                      aria-label="Distance one way, km"
                      placeholder="km"
                      className="w-10 bg-transparent text-right type-body-sm text-secondary placeholder:text-secondary focus:outline-none"
                    />
                    {f.km && <span className="-ml-2 type-body-sm text-secondary">km</span>}
                  </div>
                </div>
              )}
              {mode === "linked" && (
                <div className="flex items-center gap-2.5">
                  <label htmlFor="je-km" className="flex-1 type-body-sm text-secondary">
                    Distance one way
                  </label>
                  <div className={`${boxCls()} w-32`}>
                    <input
                      id="je-km"
                      value={f.km}
                      onChange={(e) => setF((p) => ({ ...p, km: digits(e.target.value).slice(0, 4) }))}
                      inputMode="numeric"
                      placeholder="0"
                      className={`${bareInput} text-right`} style={noOutline}
                    />
                    <span className="type-body-sm text-secondary">km</span>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Car */}
        <section className="flex flex-col gap-2.5">
          <div className={sectionHead}>
            <p className="flex-1 type-ui text-primary">Car</p>
            <p className={`type-body-sm ${carErr ? "text-error" : car ? "text-brand" : "text-secondary"}`}>{carErr ? "Required" : car ? `${car.name} selected` : "Choose a car"}</p>
          </div>
          <div
            className={`overflow-hidden rounded-lg bg-layer ${
              carErr ? "border-2 border-[var(--support-error)]" : q ? "border-2 border-brand" : "border border-gray-200"
            }`}
          >
            <label className="flex items-center gap-2.5 bg-gray-50 px-3.5 py-3 text-[var(--icon-secondary)]">
              <Icon name="magnifying-glass" size={18} />
              <input
                id="je-car-search"
                value={carQuery}
                onChange={(e) => setCarQuery(e.target.value)}
                placeholder="Search car name or number"
                aria-label="Search cars"
                className={bareInput} style={noOutline}
              />
            </label>
            {q ? (
              <>
                <p className="border-t border-gray-100 px-3.5 pb-1 pt-2.5 type-body-sm text-secondary">
                  {carHits.length === 1 ? "1 match" : `${carHits.length} matches`}
                </p>
                {carHits.map((c) => (
                  <CarRow key={c.id} c={c} on={c.id === f.carId} busy={busyLabel.get(c.id)} query={q} onPick={() => setF((p) => ({ ...p, carId: c.id }))} />
                ))}
              </>
            ) : (
              groups.map((g) => {
                const open = openGroup === g.label;
                const free = g.list.filter((c) => !busyLabel.has(c.id)).length;
                return (
                  <div key={g.label}>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenGroup(open ? null : g.label)}
                      className="flex w-full items-center gap-2.5 border-t border-gray-100 px-3.5 py-3 text-left hover:bg-layer-hover"
                    >
                      <Icon name={open ? "caret-down" : "caret-right"} size={16} className="text-[var(--icon-secondary)]" />
                      <span className="flex-1 type-ui text-primary">{g.label}</span>
                      <span className="type-body-sm text-secondary">
                        {g.list.length} car{g.list.length === 1 ? "" : "s"} · {free} free
                      </span>
                    </button>
                    {open &&
                      g.list.map((c) => (
                        <CarRow key={c.id} c={c} on={c.id === f.carId} busy={busyLabel.get(c.id)} indent onPick={() => setF((p) => ({ ...p, carId: c.id }))} />
                      ))}
                  </div>
                );
              })
            )}
          </div>
          {carErr && (
            <p className="flex items-center gap-1.5 type-body-sm text-error">
              <Icon name="warning-circle" size={16} />
              Choose the car that did this trip
            </p>
          )}
        </section>

        {/* Money */}
        <section className="flex flex-col gap-2.5">
          <p className="type-ui text-primary">Money</p>
          <div className="flex gap-2.5">
            {MoneyField({
              k: "fare",
              label: "Fare",
              invalid: fareErr,
              extra:
                linked && linked.quote > 0 && num(f.fare) === linked.quote ? (
                  <span className="rounded-full bg-gray-50 px-2 type-body-sm text-secondary">from booking</span>
                ) : undefined,
            })}
            {MoneyField({ k: "fuel", label: "Fuel" })}
            {MoneyField({ k: "driverCut", label: "Driver cut" })}
          </div>
          {fareErr && (
            <p className="flex items-center gap-1.5 type-body-sm text-error">
              <Icon name="warning-circle" size={16} />
              Enter the fare received. Use 0 for own use.
            </p>
          )}
        </section>

        {/* Note */}
        <section className="flex flex-col gap-2.5">
          <div className={sectionHead}>
            <label htmlFor="je-note" className="flex-1 type-ui text-primary">
              Note
            </label>
            <span className="type-body-sm text-secondary">optional</span>
          </div>
          <div className={boxCls()}>
            <input
              id="je-note"
              name="note"
              maxLength={500}
              value={f.note}
              onChange={set("note")}
              placeholder="Anything to remember (Hindi or English)"
              className={bareInput} style={noOutline}
            />
          </div>
        </section>

        {mode === "linked" && !entry && <p className="type-body-sm text-secondary">Saving marks the linked booking as completed.</p>}
        <FormError error={state?.error} />
      </form>
    </Drawer>
  );
}

function CarRow({
  c,
  on,
  busy,
  indent,
  query,
  onPick,
}: {
  c: CarOption;
  on: boolean;
  busy?: string;
  indent?: boolean;
  query?: string;
  onPick: () => void;
}) {
  // Highlight the searched part of the number plate (e.g. "9182").
  const plate = (() => {
    if (!query || !c.number) return c.number;
    const flat = c.number.replace(/\s/g, "").toLowerCase();
    const at = flat.indexOf(query);
    if (at < 0) return c.number;
    // Map the match back onto the spaced plate.
    let seen = 0;
    let start = -1;
    let end = -1;
    for (let i = 0; i < c.number.length; i++) {
      if (c.number[i] === " ") continue;
      if (seen === at) start = i;
      seen++;
      if (seen === at + query.length) {
        end = i + 1;
        break;
      }
    }
    if (start < 0 || end < 0) return c.number;
    return (
      <>
        {c.number.slice(0, start)}
        <span className="text-brand">{c.number.slice(start, end)}</span>
        {c.number.slice(end)}
      </>
    );
  })();

  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onPick}
      className={`flex w-full items-center gap-3 py-2.5 pr-3.5 text-left ${indent ? "pl-10" : "border-t border-gray-100 pl-3.5"} ${
        on ? "bg-hover" : "hover:bg-layer-hover"
      } ${busy && !on ? "opacity-50" : ""}`}
    >
      <Radio on={on} />
      <Icon name="car-simple" size={18} className="text-[var(--icon-secondary)]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate type-ui text-primary">
          {c.name}
          {query ? ` · ${c.type}` : ""}
        </span>
        <span className="block type-mono-sm text-secondary">{plate || "no plate"}</span>
      </span>
      <span className={`shrink-0 type-body-sm ${busy ? "text-secondary" : "text-brand"}`}>{busy ?? "Free"}</span>
    </button>
  );
}
