import type { Metadata } from "next";
import Link from "next/link";
import CommandPalette from "@/components/admin/CommandPalette";
import Icon from "@/components/admin/Icon";
import RequestActions from "@/components/admin/RequestActions";
import { NumberStrip, StatusBadge, btnGhost, btnPrimary, btnText, cardCls } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/adminAuth";
import { istDate, istTime, phoneDigits, tripKey, type Booking } from "@/lib/bookingTypes";
import { daysBetween, inr, serviceState, weekday, type Car } from "@/lib/catalogTypes";
import { listCars } from "@/lib/fleet";
import { listEntries } from "@/lib/journal";
import { listBookings } from "@/lib/store";

export const metadata: Metadata = { title: "Dashboard" };

const REPLY_TARGET_MIN = 15;

const panelHref = (b: Booking) => `/admin/bookings?id=${b.id}`;

function greeting(time: string) {
  const h = Number(time.slice(0, 2));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// "09:00" → "09:00 AM"
function clock(t: string) {
  if (!/^\d{2}:\d{2}/.test(t)) return t || "—";
  const h = Number(t.slice(0, 2));
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${t.slice(3, 5)} ${h < 12 ? "AM" : "PM"}`;
}

// IST minutes since the epoch for a "YYYY-MM-DD" + "HH:MM" pair.
const istMinutes = (date: string, time = "00:00") => Date.parse(`${date}T${time}:00+05:30`) / 60000;

function duration(min: number) {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${String(r).padStart(2, "0")} min` : `${h} h`;
}

const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" }).replace(",", "");

const route = (b: Booking) => (b.to ? `${b.from} → ${b.to}` : b.from || "No pickup yet");

export default async function DashboardPage() {
  await requireAdmin();
  const [bookings, cars, entries] = await Promise.all([listBookings(), listCars(), listEntries()]);

  const today = istDate();
  const tomorrow = istDate(1);
  const now = istTime();
  const nowMin = istMinutes(today, now);
  const live = bookings.filter((b) => b.status !== "cancelled");
  const carOf = (b: Booking) => cars.find((c) => c.id === b.carId);
  const carName = (b: Booking) => carOf(b)?.name ?? b.car;

  // ---- Needs a call back: new requests, oldest first
  const callBack = bookings.filter((b) => b.status === "new").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const waitMin = (b: Booking) => nowMin - Date.parse(b.createdAt) / 60000;
  const overdue = callBack.filter((b) => waitMin(b) > REPLY_TARGET_MIN).length;
  const receivedToday = bookings.filter((b) => istDate(b.createdAt) === today);
  const handledToday = receivedToday.filter((b) => b.status !== "new").length;

  // ---- Up next: the next contacted/confirmed trip that hasn't started
  const upcoming = live
    .filter((b) => (b.status === "contacted" || b.status === "confirmed") && b.date && istMinutes(b.date, b.time || "23:59") >= nowMin)
    .sort((a, b) => tripKey(a).localeCompare(tripKey(b)));
  const next = upcoming[0];

  // ---- Pickups: today, plus tomorrow when nothing is left today
  const isDone = (b: Booking) => b.status === "completed";
  const onTrip = (b: Booking) => b.status === "confirmed" && b.date === today && !!b.time && istMinutes(b.date, b.time) <= nowMin;
  const byTime = (a: Booking, b: Booking) => (a.time || "99").localeCompare(b.time || "99");
  const todays = live.filter((b) => b.date === today).sort(byTime);
  const todayLeft = todays.filter((b) => !isDone(b) && !onTrip(b));
  const groups = [{ day: today, items: todays }];
  if (todayLeft.length === 0) {
    const tomorrows = live.filter((b) => b.date === tomorrow && b.status !== "completed").sort(byTime);
    if (tomorrows.length) groups.push({ day: tomorrow, items: tomorrows });
  }
  const pickupCount = groups.reduce((s, g) => s + g.items.length, 0);

  // ---- This week (Mon → Sun, IST)
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const week = daysBetween(istDate(-dow), istDate(6 - dow));
  const lastWeek = daysBetween(istDate(-dow - 7), istDate(-dow - 1));
  const confirmedIn = (days: string[]) => live.filter((b) => (b.status === "confirmed" || b.status === "completed") && days.includes(b.date));
  const confirmedWeek = confirmedIn(week);
  const confirmedDelta = confirmedWeek.length - confirmedIn(lastWeek).length;
  const quotedWeek = confirmedWeek.reduce((s, b) => s + (b.quote ?? 0), 0);

  const requestsOn = (d: string) => bookings.filter((b) => istDate(b.createdAt) === d).length;
  const perDay = week.map((d) => ({ day: d, count: requestsOn(d) }));
  const weekRequests = perDay.reduce((s, d) => s + d.count, 0);
  const lastWeekRequests = lastWeek.reduce((s, d) => s + requestsOn(d), 0);
  const peak = Math.max(1, ...perDay.map((d) => d.count));

  // ---- Fleet right now
  const busy = new Map<string, Booking>();
  for (const b of todays) if (b.carId && !isDone(b) && onTrip(b)) busy.set(b.carId, b);
  for (const e of entries.filter((e) => e.date === today)) if (!busy.has(e.carId)) busy.set(e.carId, undefined as unknown as Booking);
  const serviceDue = (c: Car) => serviceState(c, entries, today).level === "due";
  const outCars = cars.filter((c) => busy.has(c.id));
  const freeCars = cars.filter((c) => !busy.has(c.id) && !serviceDue(c));
  const fleetGroups = (["SUV / MUV", "Hatchback", "Compact SUV", "Utility"] as const)
    .map((label) => ({
      label,
      cars: freeCars.filter((c) => (label === "SUV / MUV" ? c.type === "SUV" || c.type === "MUV" : c.type === label)),
    }))
    .filter((g) => g.cars.length);

  const pct = lastWeekRequests ? Math.round(((weekRequests - lastWeekRequests) / lastWeekRequests) * 100) : null;
  const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const dateLine = new Date(`${today}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="type-h2 text-primary">{greeting(now)}</h1>
          <p className="mt-1 flex items-center gap-2 type-body-sm text-secondary">
            <Icon name="dot" size={8} className="text-brand" />
            {dateLine} · updated just now, {clock(now).replace(/^0/, "")}
          </p>
        </div>
        <div className="w-full md:w-auto">
          <CommandPalette variant="header" />
        </div>
        <Link href="/admin/bookings/new" className={btnPrimary}>
          <Icon name="plus" />
          Add phone booking
        </Link>
      </div>

      {/* KPI strip */}
      <NumberStrip
        stats={[
          {
            label: "New requests",
            value: callBack.length,
            hint: callBack.length === 0 ? "all handled" : overdue ? `${overdue} waiting over ${REPLY_TARGET_MIN} min` : `reply within ${REPLY_TARGET_MIN} min`,
            tone: overdue ? "alert" : "default",
            href: "/admin/bookings?status=new",
          },
          {
            label: "Pickups today",
            value: todays.length,
            hint: [
              todays.filter(isDone).length && `${todays.filter(isDone).length === todays.length && todays.length === 2 ? "both" : todays.filter(isDone).length} done`,
              todays.filter(onTrip).length && `${todays.filter(onTrip).length} on trip`,
              todayLeft.length === 0 && next && `next ${dayLabel(next.date).split(" ")[0]} ${clock(next.time).replace(/^0/, "")}`,
            ]
              .filter(Boolean)
              .join(" · "),
            href: `/admin/bookings?from=${today}&to=${today}`,
          },
          {
            label: "Confirmed this week",
            value: confirmedWeek.length,
            hint: [
              (confirmedWeek.length > 0 || confirmedDelta !== 0) && (confirmedDelta === 0 ? "same as last week" : `${signed(confirmedDelta)} vs last week`),
              quotedWeek > 0 && inr(quotedWeek),
            ]
              .filter(Boolean)
              .join(" · "),
            href: `/admin/bookings?status=confirmed&from=${week[0]}&to=${week[6]}`,
          },
          {
            label: "Cars free",
            value: `${freeCars.length} of ${cars.length}`,
            hint: outCars.length ? `${outCars.length} on trip${outCars.length === 1 ? "" : "s"}` : "none on a trip",
            href: "/admin/fleet",
          },
        ]}
      />

      {/* Now: call backs + up next */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className={cardCls}>
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 pb-4 pt-4.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="type-h4 text-primary">Needs a call back</h2>
              <span className="type-ui text-secondary">{callBack.length}</span>
              <span className="flex-1" />
              <span className="type-body-sm text-secondary">
                {callBack.length ? `Reply target: ${REPLY_TARGET_MIN} min` : `Target: reply within ${REPLY_TARGET_MIN} min`}
              </span>
            </div>
            {receivedToday.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-2">
                  <span className="type-body-sm text-secondary">Handled today</span>
                  <span className={`type-ui ${handledToday === receivedToday.length ? "text-brand" : "text-primary"}`}>
                    {handledToday} of {receivedToday.length}
                  </span>
                </div>
                <div className="flex h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div className="bg-brand" style={{ width: `${(handledToday / receivedToday.length) * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          {callBack.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-14 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-gray-100 text-brand">
                <Icon name="check" size={24} />
              </span>
              <p className="mt-3 type-h3 text-primary">All caught up</p>
              <p className="mt-1.5 type-body-sm text-secondary">Every request today got a reply. New ones from the website appear here.</p>
            </div>
          ) : (
            <>
              <ul>
                {callBack.slice(0, 4).map((b) => {
                  const w = waitMin(b);
                  const late = w > REPLY_TARGET_MIN;
                  return (
                    <li key={b.id} className="relative flex flex-wrap items-center gap-3 border-b border-gray-100 py-3 pl-5 pr-4 hover:bg-layer-hover">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gray-100 text-[var(--icon-secondary)]">
                        <Icon name="user" size={18} />
                      </span>
                      <div className="min-w-[12rem] flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* The whole row opens the booking; the buttons sit above this link. */}
                          <Link href={panelHref(b)} className="type-ui text-primary after:absolute after:inset-0">
                            {b.name || "Unnamed"}
                          </Link>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full py-0.5 pl-2 pr-2.5 type-body-sm ${
                              late ? "bg-tag-amber text-tag-amber" : "bg-gray-50 text-secondary"
                            }`}
                          >
                            <Icon name="clock" size={14} />
                            waiting {duration(w)}
                          </span>
                        </div>
                        <p className="mt-1 truncate type-body-sm text-secondary">
                          {route(b)}
                          {b.date ? ` · ${dayLabel(b.date).replace(/ 0/, " ")}` : ""}
                        </p>
                      </div>
                      <div className="relative basis-full pl-12 sm:basis-auto sm:pl-0">
                        <RequestActions booking={b} carName={carOf(b)?.name} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="px-5 pb-2.5 pt-2">
                <Link href="/admin/bookings?status=new" className={`${btnText} px-5 py-2.5`}>
                  See all {callBack.length} new request{callBack.length === 1 ? "" : "s"}
                </Link>
              </div>
            </>
          )}
        </section>

        {/* Up next */}
        {next ? (
          <section className={`flex flex-col gap-3.5 rounded-lg bg-layer p-5 ${next.date === today ? "border-[1.5px] border-brand" : "border border-gray-100"}`}>
            <div className="flex items-center gap-2">
              <h2 className="flex-1 type-h4 text-primary">Up next</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 py-0.5 pl-2 pr-2.5 type-body-sm text-secondary">
                <Icon name="clock" size={14} />
                in {duration(istMinutes(next.date, next.time || "00:00") - nowMin).replace(/ min$/, " min").replace(/ 00 min$/, "")}
              </span>
            </div>
            <p className="flex items-baseline gap-2.5">
              <span className="type-h2 text-primary">{clock(next.time)}</span>
              <span className="type-body-sm text-secondary">{next.date === today ? "today" : dayLabel(next.date).replace(/ 0/, " ")}</span>
            </p>
            <div>
              <p className="type-ui text-primary">{next.name || "Unnamed"}</p>
              <p className="mt-0.5 type-body-sm text-secondary">{next.phone}</p>
            </div>
            <div className="flex flex-col gap-2 rounded-md bg-gray-50 p-3 type-body-sm text-primary">
              <p className="flex items-center gap-2">
                <Icon name="map-pin" className="text-[var(--icon-secondary)]" />
                Pickup: {next.from || "—"}
              </p>
              {next.to && (
                <p className="flex items-center gap-2">
                  <Icon name="path" className="text-[var(--icon-secondary)]" />
                  Drop: {next.to}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Icon name="car-simple" className="text-[var(--icon-secondary)]" />
              <span className="flex-1 type-body-sm text-secondary">{carOf(next) ? `${carOf(next)?.name} · car ready` : "Car not assigned"}</span>
              <StatusBadge status={next.status} />
            </div>
            <div className="flex gap-2">
              {phoneDigits(next.phone) && (
                <a href={`tel:+91${phoneDigits(next.phone)}`} className={`${btnGhost} flex-1`}>
                  <Icon name="phone" />
                  Call customer
                </a>
              )}
              <Link href={panelHref(next)} className={`${btnPrimary} flex-1`}>
                Open booking
              </Link>
            </div>
          </section>
        ) : (
          <section className={`${cardCls} p-5`}>
            <h2 className="type-h4 text-primary">Up next</h2>
            <p className="mt-3 type-body-sm text-secondary">No contacted or confirmed trips ahead. Confirm a request and it shows up here.</p>
          </section>
        )}
      </div>

      {/* Today: pickups + fleet */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className={cardCls}>
          <div className="flex items-center gap-2 pb-2.5 pl-5 pr-3 pt-3.5">
            <h2 className="type-h4 text-primary">Today’s pickups</h2>
            <span className="type-ui text-secondary">{pickupCount}</span>
            <span className="flex-1" />
            <Link href="/admin/bookings" className={`${btnText} px-5 py-2.5`}>
              View all bookings
            </Link>
          </div>
          <div className="pb-3 pl-5 pr-4">
            {pickupCount === 0 && <p className="pb-4 type-body-sm text-secondary">No pickups today or tomorrow.</p>}
            {groups.map((g) =>
              g.items.length === 0 ? null : (
                <div key={g.day}>
                  {groups.length > 1 && (
                    <p className="mb-2.5 mt-1 border-b border-gray-100 pb-1.5 type-body-sm text-secondary">
                      {g.day === today ? "Today" : "Tomorrow"} · {dayLabel(g.day).replace(/ 0/, " ")}
                    </p>
                  )}
                  <ol>
                    {g.items.map((b, i) => {
                      const done = isDone(b);
                      const trip = onTrip(b);
                      const isNext = b.id === next?.id;
                      const last = i === g.items.length - 1;
                      const dot = done
                        ? "bg-gray-200"
                        : trip
                          ? "bg-brand"
                          : isNext
                            ? "border-2 border-brand bg-layer"
                            : "border-2 border-gray-200 bg-layer";
                      const right = done
                        ? { text: "Completed", cls: "text-secondary" }
                        : trip
                          ? { text: "On trip", cls: "text-brand" }
                          : isNext
                            ? { text: g.day === today ? "Up next" : `Up next · in ${duration(istMinutes(b.date, b.time || "00:00") - nowMin).split(" ").slice(0, 2).join(" ")}`, cls: g.day === today ? "text-secondary" : "text-brand" }
                            : { text: b.status === "confirmed" ? "Confirmed" : b.status === "contacted" ? "Contacted" : "Not confirmed", cls: "text-secondary" };
                      return (
                        <li key={b.id}>
                          <Link href={panelHref(b)} className="group flex items-start gap-3.5">
                            <span className={`w-21 shrink-0 type-mono-md ${done ? "text-secondary" : "text-primary"}`}>{clock(b.time)}</span>
                            <span className="flex flex-col items-center self-stretch pt-0.5">
                              <span className={`grid size-3.5 shrink-0 place-items-center rounded-full ${dot}`} />
                              {!last && <span className="w-0.5 flex-1 bg-gray-200" />}
                            </span>
                            <span className={`min-w-0 flex-1 pb-4.5 ${done ? "text-secondary" : ""}`}>
                              <span className={`block type-ui group-hover:text-link-hover ${done ? "" : "text-primary"}`}>{b.name || "Unnamed"}</span>
                              <span className="mt-0.5 block truncate type-body-sm text-secondary">
                                {route(b)}
                                {carName(b) ? ` · ${carName(b)}` : " · car not assigned"}
                              </span>
                            </span>
                            <span className={`shrink-0 type-body-sm ${right.cls}`}>{right.text}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ),
            )}
          </div>
        </section>

        <section className={`flex flex-col gap-3 p-5 ${cardCls}`}>
          <div className="flex items-center gap-2">
            <h2 className="flex-1 type-h4 text-primary">Fleet right now</h2>
            <Link href="/admin/fleet" className={`${btnText} px-5 py-2.5`}>
              Open fleet
            </Link>
          </div>
          <p className="flex items-baseline gap-2.5">
            <span className="type-h3 text-primary">{freeCars.length} free</span>
            <span className="type-body-sm text-secondary">{outCars.length ? `${outCars.length} on trip${outCars.length === 1 ? "" : "s"}` : "all in the garage"}</span>
          </p>
          {outCars.length > 0
            ? outCars.map((c) => {
                const b = busy.get(c.id);
                return (
                  <div key={c.id} className="flex items-center gap-2.5 border-t border-gray-100 pt-2">
                    <Icon name="car-simple" size={18} className="text-[var(--icon-secondary)]" />
                    <div className="min-w-0 flex-1">
                      <p className="type-ui text-primary">{c.name}</p>
                      <p className="truncate type-body-sm text-secondary">{b ? `${b.name || "Customer"} · ${b.to ? b.to : "local"}` : "Logged in today’s journal"}</p>
                    </div>
                    {b?.time && <span className="shrink-0 type-body-sm text-secondary">left {clock(b.time).replace(/^0/, "")}</span>}
                  </div>
                );
              })
            : fleetGroups.map((g) => (
                <div key={g.label} className="flex items-center gap-2.5 border-t border-gray-100 pt-2">
                  <Icon name="car-simple" size={18} className="text-[var(--icon-secondary)]" />
                  <div className="min-w-0 flex-1">
                    <p className="type-ui text-primary">{g.label}</p>
                    <p className="type-body-sm text-secondary">{g.cars.map((c) => c.name).join(", ")}</p>
                  </div>
                  <span className="shrink-0 type-body-sm text-brand">{g.cars.length} free</span>
                </div>
              ))}
          {cars.length - freeCars.length - outCars.length > 0 && (
            <p className="border-t border-gray-100 pt-2 type-body-sm text-error">{cars.length - freeCars.length - outCars.length} due for service</p>
          )}
        </section>
      </div>

      {/* Bookings this week */}
      <section className={`flex flex-col gap-3 p-5 ${cardCls}`}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1 type-h4 text-primary">Bookings this week</h2>
          <span className="type-body-sm text-secondary">
            {weekRequests} request{weekRequests === 1 ? "" : "s"}
            {pct !== null && ` · ${signed(pct)}% vs last week`}
          </span>
        </div>
        <div className="flex items-end gap-2 sm:gap-6">
          {perDay.map((d) => {
            const isToday = d.day === today;
            return (
              <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span className={`type-mono-sm ${isToday ? "text-brand" : "text-secondary"}`}>{d.count}</span>
                <span
                  className={`w-full rounded-sm ${isToday ? "bg-brand" : "bg-gray-100"}`}
                  style={{ height: `${Math.max(4, Math.round((d.count / peak) * 64))}px` }}
                />
                <span className={`type-body-sm ${isToday ? "text-primary" : "text-secondary"}`}>{isToday ? "Today" : weekday(d.day)}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
