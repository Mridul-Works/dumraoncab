import type { Metadata } from "next";
import Link from "next/link";
import EntryPanel, { type BookingOption, type BusyCar } from "@/components/admin/EntryPanel";
import Icon from "@/components/admin/Icon";
import JournalToast from "@/components/admin/JournalToast";
import { rangeLabel, time12 } from "@/components/admin/JournalFormat";
import JournalToolbar from "@/components/admin/JournalToolbar";
import {
  AttentionList,
  BarRow,
  CarLead,
  DateLead,
  DayHeader,
  EntryRow,
  FareSplit,
  IdleRow,
  KmChart,
  RailPanel,
  ServiceGauge,
  ServiceRow,
  TableHead,
  Totals,
  kmText,
  pct,
  type Attention,
} from "@/components/admin/JournalParts";
import ServiceForm from "@/components/admin/ServiceForm";
import { EmptyState, PageHeader, btnGhost, btnPrimary, btnText, cardCls } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/adminAuth";
import { istDate } from "@/lib/bookingTypes";
import { carLabel, daysBetween, entryNet, inr, serviceState, shortDate, weekday, type Car } from "@/lib/catalogTypes";
import { listCars } from "@/lib/fleet";
import { listEntries, type JournalRecord } from "@/lib/journal";
import { site } from "@/lib/site";
import { listBookings } from "@/lib/store";

export const metadata: Metadata = { title: "Daily journal" };

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const DAYS_SHOWN = 10;

function totals(list: JournalRecord[]) {
  const t = { trips: list.length, km: 0, fare: 0, fuel: 0, driver: 0, net: 0, ownUse: 0, ownUseCost: 0 };
  for (const e of list) {
    t.km += e.km ?? 0;
    t.fare += e.fare;
    t.fuel += e.fuel;
    t.driver += e.driverCut;
    t.net += entryNet(e);
    if (e.fare === 0 && !e.customer && !e.bookingId) {
      t.ownUse++;
      t.ownUseCost += e.fuel + e.driverCut;
    }
  }
  return t;
}

const perKm = (fare: number, km: number) => (km > 0 ? `₹${(fare / km).toFixed(1)} per km` : "no km logged");

export default async function JournalPage({ searchParams }: { searchParams: Search }) {
  await requireAdmin();
  const sp = await searchParams;
  const [entries, cars, bookings] = await Promise.all([listEntries(), listCars(), listBookings()]);
  const today = istDate();
  const yesterday = istDate(-1);

  // Date range: defaults to this month so far.
  let from = validDate(one(sp.from)) ? one(sp.from) : `${today.slice(0, 8)}01`;
  let to = validDate(one(sp.to)) ? one(sp.to) : today;
  if (from > to) [from, to] = [to, from];
  const car = cars.find((c) => c.id === one(sp.car));
  const carById = new Map(cars.map((c) => [c.id, c]));

  const rangeQs = (extra: Record<string, string> = {}) => {
    const q = new URLSearchParams();
    if (one(sp.from)) q.set("from", from);
    if (one(sp.to)) q.set("to", to);
    for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
    const s = q.toString();
    return `/admin/journal${s ? `?${s}` : ""}`;
  };
  const returnTo = rangeQs({ car: car?.id ?? "", all: one(sp.all) });
  const plus = (extra: string) => `${returnTo}${returnTo.includes("?") ? "&" : "?"}${extra}`;

  const inRange = entries.filter((e) => e.date >= from && e.date <= to);
  const journaledIds = new Set(entries.map((e) => e.bookingId).filter(Boolean));

  /* ------------------------------ entry panel ------------------------------ */
  const editing = one(sp.entry) ? entries.find((e) => e.id === one(sp.entry)) : undefined;
  const panelOpen = one(sp.new) === "1" || Boolean(editing);
  const bookingOptions: BookingOption[] = bookings
    .filter(
      (b) =>
        b.id === one(sp.booking) ||
        b.id === editing?.bookingId ||
        ((b.status === "confirmed" || b.status === "completed") && !journaledIds.has(b.id) && b.date && b.date <= today && b.date >= istDate(-45)),
    )
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
    .map((b) => ({ id: b.id, date: b.date, time: b.time, name: b.name, phone: b.phone, from: b.from, to: b.to, carId: b.carId ?? "", quote: b.quote ?? 0 }));
  const busy: BusyCar[] = bookings
    .filter((b) => b.carId && b.date && (b.status === "contacted" || b.status === "confirmed") && b.id !== editing?.bookingId && b.id !== one(sp.booking))
    .map((b) => ({ carId: b.carId as string, date: b.date, label: `On trip${b.time ? ` · ${time12(b.time)}` : ""}` }));

  const panel = panelOpen ? (
    <EntryPanel
      key={editing?.id ?? `new-${one(sp.booking)}-${one(sp.date)}`}
      entry={editing}
      prefillBookingId={one(sp.booking)}
      prefillDate={validDate(one(sp.date)) ? one(sp.date) : undefined}
      cars={cars.map((c) => ({ id: c.id, name: c.name, number: c.number, type: c.type }))}
      bookings={bookingOptions}
      busy={busy}
      today={today}
      baseTown={site.address.locality}
      returnTo={returnTo}
      defaultCarId={car?.id}
    />
  ) : null;

  /* ---------------------------------- toast ---------------------------------- */
  const saved = one(sp.saved) ? entries.find((e) => e.id === one(sp.saved)) : undefined;
  // Only a brand-new entry can be undone (the save action marks it with added=1).
  const fresh = saved && !saved.updatedAt && one(sp.added) === "1";
  const toast = saved ? (
    <JournalToast
      message={`Entry saved · ${carById.get(saved.carId)?.name ?? "Removed car"} · net ${inr(entryNet(saved))}`}
      entryId={fresh ? saved.id : undefined}
      bookingId={saved.bookingId}
      was={one(sp.was)}
      closeHref={returnTo}
    />
  ) : null;

  /* ================================ One car ================================ */
  if (car) {
    const mine = inRange.filter((e) => e.carId === car.id);
    const t = totals(mine);
    const days = daysBetween(from, to);
    const kmByDay = new Map<string, number>();
    for (const e of mine) kmByDay.set(e.date, (kmByDay.get(e.date) ?? 0) + (e.km ?? 0));
    const service = serviceState(car, entries, today);
    const allMine = entries.filter((e) => e.carId === car.id);
    const lastEntry = allMine[0];
    const rangeName =
      from === `${today.slice(0, 8)}01` && to === today ? "this month" : to === today && daysBetween(from, to).length <= 7 ? "this week" : "in range";

    // Trips and idle runs, newest first.
    type Row = { kind: "trip"; e: JournalRecord } | { kind: "idle"; start: string; end: string; n: number };
    const rows: Row[] = [];
    // Idle runs only between logged trips (no trips at all → empty state).
    const firstDay = mine.length ? mine[mine.length - 1].date : "9999-12-31";
    for (const d of [...days].reverse().filter((d) => d <= today && d >= firstDay)) {
      const list = mine.filter((e) => e.date === d);
      if (list.length) for (const e of list) rows.push({ kind: "trip", e });
      else {
        const last = rows[rows.length - 1];
        if (last?.kind === "idle") {
          last.start = d;
          last.n++;
        } else rows.push({ kind: "idle", start: d, end: d, n: 1 });
      }
    }

    const gauge = service.kmNow != null && car.nextServiceKm != null && car.odometerKm != null && car.nextServiceKm > car.odometerKm;
    const daysToService = car.nextServiceDate ? Math.round((Date.parse(car.nextServiceDate) - Date.parse(today)) / 86_400_000) : null;
    const serviceWhen =
      daysToService == null
        ? null
        : daysToService < 0
          ? `${-daysToService} days overdue`
          : daysToService === 0
            ? "today"
            : daysToService < 14
              ? `in ${daysToService} days`
              : `about ${Math.round(daysToService / 7)} weeks`;

    return (
      <>
        <div className="flex flex-wrap items-center gap-4">
          <span className="hidden size-14 shrink-0 place-items-center rounded-full border border-gray-200 bg-layer text-[var(--icon-primary)] sm:grid">
            <Icon name="car-simple" size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <Link href={rangeQs()} className="inline-flex items-center gap-1.5 type-ui text-link hover:text-link-hover">
              <Icon name="arrow-left" size={14} />
              Daily journal
            </Link>
            <p className="flex flex-wrap items-baseline gap-x-3">
              <span className="type-h2 text-primary">{car.name}</span>
              <span className="type-body-sm text-secondary">{[car.number, car.type, car.fuel].filter(Boolean).join(" · ")}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/admin/fleet/${car.id}`} className={btnGhost}>
              Car details
            </Link>
            <Link href={plus("new=1")} scroll={false} className={btnPrimary}>
              <Icon name="plus" size={16} />
              New entry for {car.name}
            </Link>
          </div>
        </div>

        <div className="mt-5">
          <JournalToolbar from={from} to={to} today={today} carId={car.id} carName={car.name} cars={[]} />
        </div>

        <div className="mt-5">
          <Totals
            items={[
              {
                icon: "gauge",
                label: "Odometer now",
                value: service.kmNow != null ? kmText(service.kmNow) : "—",
                sub: service.kmNow != null ? (lastEntry ? `last entry ${shortDate(lastEntry.date)}` : "from last reading") : "no reading yet",
              },
              { icon: "gauge", label: `Driven ${rangeName}`, value: kmText(t.km), sub: `${t.trips} trip${t.trips === 1 ? "" : "s"}` },
              { icon: "wallet", label: "Fare", value: inr(t.fare), sub: perKm(t.fare, t.km) },
              {
                icon: "gas-pump",
                label: "Fuel and driver",
                value: inr(t.fuel + t.driver),
                sub: t.ownUse ? `${t.ownUse} own-use trip${t.ownUse === 1 ? "" : "s"}` : `${pct(t.fuel + t.driver, t.fare)}% of fare`,
              },
              {
                icon: "arrow-up-right",
                label: "Net",
                value: t.net < 0 ? `−${inr(-t.net)}` : inr(t.net),
                tone: t.net < 0 ? "error" : "brand",
                sub: t.ownUse ? `own use cost ${inr(t.ownUseCost)}` : `${pct(Math.max(0, t.net), t.fare)}% of fare kept`,
                highlight: true,
              },
            ]}
          />
        </div>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <KmChart days={days.slice(-62)} kmByDay={kmByDay} today={today} label={rangeLabel(from, to)} />

          <section className={`flex w-full shrink-0 flex-col gap-4 px-5 py-4 lg:w-[340px] ${cardCls}`}>
            <div className="flex items-center gap-2">
              <Icon name="wrench" size={18} className="text-[var(--icon-primary)]" />
              <h2 className="flex-1 type-h4 text-primary">Next service</h2>
              {serviceWhen && (
                <span className="flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-[3px] type-body-sm text-secondary">
                  <Icon name="calendar-blank" size={14} />
                  {serviceWhen}
                </span>
              )}
            </div>
            {gauge ? (
              <>
                <div className="flex justify-center">
                  <ServiceGauge start={car.odometerKm as number} now={service.kmNow as number} due={car.nextServiceKm as number} />
                </div>
                <div className="flex items-start gap-2">
                  <div>
                    <p className="type-mono-sm text-primary">{(car.odometerKm as number).toLocaleString("en-IN")}</p>
                    <p className="type-body-sm text-secondary">Reading{car.odometerDate ? ` · ${shortDate(car.odometerDate)}` : ""}</p>
                  </div>
                  <span className="flex-1" />
                  <div className="text-center">
                    <p className="type-mono-sm text-brand">{(service.kmNow as number).toLocaleString("en-IN")}</p>
                    <p className="type-body-sm text-secondary">Now</p>
                  </div>
                  <span className="flex-1" />
                  <div className="text-right">
                    <p className="type-mono-sm text-primary">{(car.nextServiceKm as number).toLocaleString("en-IN")}</p>
                    <p className="type-body-sm text-secondary">Due</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="type-body-sm text-secondary">
                {service.level === "unset" ? "No service set yet. Add the odometer reading and when the next service is due." : service.label}
              </p>
            )}
            <div className="h-px bg-gray-100" />
            <details open={!gauge && service.level === "unset"} className="group -mx-5 -mb-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-5 pb-4 type-ui text-primary [&::-webkit-details-marker]:hidden">
                <Icon name="caret-right" size={16} className="text-[var(--icon-secondary)] transition-transform group-open:rotate-90" />
                Update reading and service
              </summary>
              <ServiceForm car={car} state={service} today={today} />
            </details>
          </section>
        </div>

        <section className={`mt-5 overflow-hidden ${cardCls}`}>
          <TableHead first="Date" firstWidth="w-[110px]" />
          {rows.length === 0 ? (
            <EmptyState title="Nothing logged in this range yet">Use &ldquo;New entry for {car.name}&rdquo; after each trip.</EmptyState>
          ) : (
            rows.map((r) =>
              r.kind === "trip" ? (
                <EntryRow
                  key={r.e.id}
                  e={r.e}
                  lead={<DateLead date={r.e.date} weekday={weekday(r.e.date)} />}
                  editHref={plus(`entry=${r.e.id}`)}
                  highlight={r.e.id === saved?.id}
                />
              ) : (
                <IdleRow
                  key={`idle-${r.start}`}
                  text={r.n === 1 ? `No trips logged on ${shortDate(r.start)}` : `No trips logged ${shortDate(r.start)} – ${shortDate(r.end)} (${r.n} days)`}
                  addHref={plus(`new=1&date=${r.end}`)}
                />
              ),
            )
          )}
        </section>
        {panel}
        {toast}
      </>
    );
  }

  /* ================================ Overview ================================ */
  const t = totals(inRange);
  const carsUsed = new Set(inRange.map((e) => e.carId)).size;
  const carName = (id: string) => carById.get(id)?.name ?? "Removed car";

  // Needs attention
  const attention: Attention[] = [];
  for (const e of inRange) {
    const where = `${carName(e.carId)} · ${shortDate(e.date)}`;
    if (e.fare > 0 && e.fuel > e.fare) attention.push({ key: `f-${e.id}`, title: "Fuel more than fare", detail: `${where} · −${inr(-entryNet(e))}`, href: plus(`entry=${e.id}`) });
    else if (e.fare > 0 && entryNet(e) < 0) attention.push({ key: `l-${e.id}`, title: "Ran at a loss", detail: `${where} · −${inr(-entryNet(e))}`, href: plus(`entry=${e.id}`) });
    if (e.fare === 0 && (e.customer || e.bookingId))
      attention.push({ key: `z-${e.id}`, title: "No fare entered", detail: `${where}${e.km ? ` · ${e.km} km` : ""}`, href: plus(`entry=${e.id}`) });
  }
  for (const b of bookings) {
    if (journaledIds.has(b.id) || !b.date || b.date > today || b.date < istDate(-45)) continue;
    if (b.status === "completed")
      attention.push({ key: `b-${b.id}`, title: "Trip not in the journal", detail: `${b.name || "Unnamed"} · ${shortDate(b.date)} · ${b.from} → ${b.to || "—"}`, href: plus(`new=1&booking=${b.id}`) });
    else if (b.status === "confirmed" && b.date < today)
      attention.push({ key: `c-${b.id}`, title: "Still marked confirmed", detail: `${b.name || "Unnamed"} · was due ${shortDate(b.date)}`, href: `/admin/bookings?id=${b.id}` });
  }

  // By car (net in range)
  const byCar = cars
    .map((c) => ({ car: c, t: totals(inRange.filter((e) => e.carId === c.id)) }))
    .filter((r) => r.t.trips > 0)
    .sort((a, b) => b.t.net - a.t.net);
  const maxNet = Math.max(1, ...byCar.map((r) => r.t.net));

  // Service due, most urgent first
  const services = cars
    .map((c) => ({ car: c, s: serviceState(c, entries, today) }))
    .filter((r) => r.s.level !== "unset")
    .map((r) => {
      const { car: c, s } = r;
      const left = c.nextServiceKm != null && s.kmNow != null ? c.nextServiceKm - s.kmNow : null;
      const days = c.nextServiceDate ? Math.round((Date.parse(c.nextServiceDate) - Date.parse(today)) / 86_400_000) : null;
      const title =
        left != null
          ? left <= 0
            ? `${c.name} · ${(-left).toLocaleString("en-IN")} km over`
            : `${c.name} in ${left.toLocaleString("en-IN")} km`
          : days != null
            ? days < 0
              ? `${c.name} · ${-days} days overdue`
              : `${c.name} in ${days} day${days === 1 ? "" : "s"}`
            : c.name;
      const detail =
        c.nextServiceKm != null
          ? `Due at ${c.nextServiceKm.toLocaleString("en-IN")} km${s.kmNow != null ? ` · now ${s.kmNow.toLocaleString("en-IN")}` : ""}`
          : `Due ${shortDate(c.nextServiceDate as string)}`;
      const progress =
        c.nextServiceKm != null && s.kmNow != null && c.odometerKm != null && c.nextServiceKm > c.odometerKm
          ? Math.min(1, Math.max(0, (s.kmNow - c.odometerKm) / (c.nextServiceKm - c.odometerKm)))
          : undefined;
      const urgency = left != null ? left : days != null ? days * 50 : 1e9;
      return { key: c.id, title, detail, progress, tone: (s.level === "due" ? "error" : s.level === "soon" ? "amber" : "brand") as "error" | "amber" | "brand", urgency, href: rangeQs({ car: c.id }) };
    })
    .sort((a, b) => a.urgency - b.urgency);

  // Entries by day (newest first), capped unless "Show earlier days"
  const byDay = new Map<string, JournalRecord[]>();
  for (const e of inRange) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const dayList = [...byDay.entries()];
  const showAll = one(sp.all) === "1";
  const shownDays = showAll ? dayList : dayList.slice(0, DAYS_SHOWN);
  const dayFmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).replace(",", "");

  const exportHref = `/admin/journal/export?from=${from}&to=${to}`;

  return (
    <>
      <PageHeader title="Daily journal" intro="Kilometres, fuel and driver cut for every trip, so you know what each car really earns.">
        <a href={exportHref} className={btnGhost}>
          Export
        </a>
        <Link href={plus("new=1")} scroll={false} className={btnPrimary}>
          <Icon name="plus" size={16} />
          New entry
        </Link>
      </PageHeader>

      <div className="mt-5">
        <JournalToolbar from={from} to={to} today={today} carId="" cars={cars.map((c) => ({ id: c.id, label: carLabel(c) }))} attention={attention.length} />
      </div>

      <div className="mt-5">
        <Totals
          items={[
            { icon: "gauge", label: "Kilometres", value: kmText(t.km), sub: `${t.trips} trip${t.trips === 1 ? "" : "s"} · ${carsUsed} car${carsUsed === 1 ? "" : "s"}` },
            { icon: "wallet", label: "Fare collected", value: inr(t.fare), sub: perKm(t.fare, t.km) },
            { icon: "gas-pump", label: "Fuel", value: inr(t.fuel), sub: `${pct(t.fuel, t.fare)}% of fare`, subTone: pct(t.fuel, t.fare) >= 50 ? "amber" : "default" },
            { icon: "user", label: "Driver cut", value: inr(t.driver), sub: `${pct(t.driver, t.fare)}% of fare` },
            {
              icon: "arrow-up-right",
              label: "Net earnings",
              value: t.net < 0 ? `−${inr(-t.net)}` : inr(t.net),
              tone: t.net < 0 ? "error" : "brand",
              sub: `${pct(Math.max(0, t.net), t.fare)}% of fare kept`,
              highlight: true,
            },
          ]}
        />
      </div>

      <div className="mt-5">
        <FareSplit fare={t.fare} fuel={t.fuel} driver={t.driver} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <RailPanel title="Needs attention" count={attention.length} id="attention">
          {attention.length === 0 ? (
            <EmptyState title="Nothing to fix">Every finished trip is logged and every entry adds up.</EmptyState>
          ) : (
            <div className="max-h-[22rem] overflow-y-auto">
              <AttentionList items={attention} />
            </div>
          )}
        </RailPanel>

        <RailPanel title="By car" count={byCar.length}>
          {byCar.length === 0 ? (
            <EmptyState title="No trips in this range" />
          ) : (
            <div className="max-h-[22rem] overflow-y-auto py-1">
              {byCar.map((r) => (
                <BarRow
                  key={r.car.id}
                  name={r.car.name}
                  href={rangeQs({ car: r.car.id })}
                  sub={kmText(r.t.km)}
                  amount={r.t.net < 0 ? `−${inr(-r.t.net)}` : inr(r.t.net)}
                  value={r.t.net}
                  max={maxNet}
                  negative={r.t.net < 0}
                />
              ))}
            </div>
          )}
        </RailPanel>

        <RailPanel title="Service due">
          {services.length === 0 ? (
            <EmptyState title="No service dates set">Open a car and set its next service.</EmptyState>
          ) : (
            <div className="max-h-[22rem] overflow-y-auto">
              {services.slice(0, 6).map((s) => (
                <ServiceRow key={s.key} title={s.title} detail={s.detail} progress={s.progress} tone={s.tone} href={s.href} />
              ))}
            </div>
          )}
        </RailPanel>
      </div>

      <section className={`mt-5 overflow-hidden ${cardCls}`}>
        <TableHead first="Car" firstWidth="w-[150px]" />
        {dayList.length === 0 ? (
          <EmptyState title="No trips logged in this range">Use &ldquo;New entry&rdquo; after each trip — pick the booking and the details fill in.</EmptyState>
        ) : (
          <>
            {shownDays.map(([day, list]) => {
              const dt = totals(list);
              const named = day === today ? "Today" : day === yesterday ? "Yesterday" : null;
              return (
                <div key={day}>
                  <DayHeader label={named ?? dayFmt(day)} sub={named ? dayFmt(day) : undefined} km={dt.km} fare={dt.fare} fuel={dt.fuel} driver={dt.driver} net={dt.net} />
                  {list.map((e) => (
                    <EntryRow
                      key={e.id}
                      e={e}
                      lead={<CarLead car={carById.get(e.carId) as Car | undefined} href={rangeQs({ car: e.carId })} />}
                      editHref={plus(`entry=${e.id}`)}
                      highlight={e.id === saved?.id}
                    />
                  ))}
                </div>
              );
            })}
            {!showAll && dayList.length > DAYS_SHOWN && (
              <div className="py-2 pl-3">
                <Link href={rangeQs({ all: "1" })} scroll={false} className={`${btnText} px-5 py-2.5`}>
                  Show earlier days
                </Link>
              </div>
            )}
          </>
        )}
      </section>
      {panel}
      {toast}
    </>
  );
}
