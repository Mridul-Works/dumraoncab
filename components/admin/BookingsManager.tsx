"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fmtDate, fmtShortDate, fmtTime, route, sourceId } from "@/components/admin/BookingFormat";
import BookingPanel, { type CarOption } from "@/components/admin/BookingPanel";
import Icon from "@/components/admin/Icon";
import { StatusBadge, btnGhost, cardCls } from "@/components/admin/ui";
import { BOOKING_STATUSES, STATUS_LABELS, isWebsiteBooking, tripKey, type Booking, type BookingStatus } from "@/lib/bookingTypes";
import { inr } from "@/lib/catalogTypes";

type StatusFilter = "all" | BookingStatus;
type SourceFilter = "all" | "website" | "phone";
type Sort = "received" | "travel";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

function matches(b: Booking, q: string) {
  if (!q) return true;
  const hay = [b.name, b.phone, b.phone.replace(/\D/g, ""), b.from, b.to, b.service, b.car, b.notes, b.adminNote ?? ""].join(" ").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((word) => hay.includes(word));
}

const pick = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

// Grid columns shared by the table header and rows (Figma widths 200/250/140/120/130/112 + chevron).
const COLS =
  "lg:grid-cols-[minmax(0,200fr)_minmax(0,250fr)_minmax(0,140fr)_minmax(0,120fr)_112px_16px] xl:grid-cols-[minmax(0,200fr)_minmax(0,250fr)_minmax(0,140fr)_minmax(0,120fr)_minmax(0,130fr)_112px_16px]";

function Stat({ label, value, hint, highlight = false }: { label: string; value: React.ReactNode; hint: string; highlight?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 rounded-lg bg-layer p-5 ${highlight ? "border-[1.5px] border-brand" : "border border-gray-100"}`}>
      <p className="truncate type-ui text-secondary">{label}</p>
      <p className={`type-h2 tabular-nums ${highlight ? "text-brand" : "text-primary"}`}>{value}</p>
      <p className="truncate type-body-sm text-secondary">{hint}</p>
    </div>
  );
}

// Figma 3.1–3.4. Filters and the open drawer live in the URL, so dashboard
// links, the ⌘K search and the back button all land on the right view.
export default function BookingsManager({
  bookings,
  cars,
  journaled,
  today,
  now,
}: {
  bookings: Booking[];
  cars: CarOption[];
  journaled: string[];
  today: string;
  now: string; // "HH:MM", Indian time
}) {
  const params = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const status = pick<StatusFilter>(params.get("status"), ["all", ...BOOKING_STATUSES], "all");
  // Source and sort have no controls in the design; still honoured from links (⌘K "Website requests").
  const source = pick<SourceFilter>(params.get("source"), ["all", "website", "phone"], "all");
  const sort = pick<Sort>(params.get("sort"), ["received", "travel"], "received");
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const openId = params.get("id");

  const [query, setQuery] = useState(urlQuery);
  // Back from "Add phone booking" (Figma 3B.4): ?saved=<id>&n=<name>&wa=1 → toast + highlighted row.
  const savedId = params.get("saved");
  const [highlight] = useState(savedId);
  const [toast, setToast] = useState<string | null>(() =>
    savedId ? `Booking saved for ${params.get("n") || "the customer"}${params.get("wa") === "1" ? " · confirmation sent on WhatsApp" : ""}` : null,
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const setParams = useCallback((patch: Record<string, string | null>, mode: "push" | "replace" = "replace") => {
    const next = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    if (savedId) setParams({ saved: null, n: null, wa: null });
  }, [savedId, setParams]);

  // Pickup date presets → from/to in the URL.
  const weekStart = addDays(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
  const presets = useMemo(
    () =>
      [
        { id: "any", label: "any date", from: "", to: "" },
        { id: "today", label: "today", from: today, to: today },
        { id: "tomorrow", label: "tomorrow", from: addDays(today, 1), to: addDays(today, 1) },
        { id: "week", label: "this week", from: weekStart, to: addDays(weekStart, 6) },
        { id: "next7", label: "next 7 days", from: today, to: addDays(today, 6) },
        { id: "upcoming", label: "upcoming", from: today, to: "" },
        { id: "past", label: "past", from: "", to: addDays(today, -1) },
      ] as const,
    [today, weekStart],
  );
  const preset = presets.find((p) => p.from === from && p.to === to);
  const dateLabel = preset ? preset.label : `${from ? fmtShortDate(from) : "…"} – ${to ? fmtShortDate(to) : "…"}`;

  const q = query.trim();
  // Base set for the tab counts: everything except the status filter itself.
  const base = useMemo(
    () =>
      bookings.filter(
        (b) =>
          (source === "all" || (source === "website") === isWebsiteBooking(b)) &&
          (!from || (b.date && b.date >= from)) &&
          (!to || (b.date && b.date <= to)) &&
          matches(b, q),
      ),
    [bookings, source, from, to, q],
  );

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: base.length, new: 0, contacted: 0, confirmed: 0, completed: 0, cancelled: 0 };
    for (const b of base) c[b.status]++;
    return c;
  }, [base]);

  const visible = useMemo(() => {
    const list = base.filter((b) => status === "all" || b.status === status);
    if (sort === "travel") list.sort((a, b) => tripKey(a).localeCompare(tripKey(b)));
    return list;
  }, [base, status, sort]);

  // KPI cards (unfiltered).
  const stats = useMemo(() => {
    const live = bookings.filter((b) => b.status !== "cancelled");
    const todays = live.filter((b) => b.date === today);
    const next = todays
      .filter((b) => b.status !== "completed" && (!b.time || b.time >= now))
      .sort((a, b) => (a.time || "99").localeCompare(b.time || "99"))[0];
    const weekEnd = addDays(weekStart, 6);
    const confirmedWeek = bookings.filter((b) => b.status === "confirmed" && b.date >= weekStart && b.date <= weekEnd);
    const month = today.slice(0, 7);
    const prevMonthDate = addDays(`${month}-01`, -1);
    const prevMonth = prevMonthDate.slice(0, 7);
    const doneIn = (m: string) => bookings.filter((b) => b.status === "completed" && b.date.startsWith(m)).length;
    const done = doneIn(month);
    const donePrev = doneIn(prevMonth);
    const prevName = MONTHS[Number(prevMonth.slice(5, 7)) - 1];
    return {
      fresh: bookings.filter((b) => b.status === "new").length,
      pickups: todays.length,
      pickupHint: next ? `Next: ${next.time ? fmtTime(next.time) : "time not set"}, ${next.to || next.from}` : todays.length ? "None left today" : "Nothing booked for today",
      confirmedWeek: confirmedWeek.length,
      quotedWeek: `${inr(confirmedWeek.reduce((s, b) => s + (b.quote ?? 0), 0))} quoted`,
      monthName: MONTHS[Number(month.slice(5, 7)) - 1],
      done,
      doneHint: donePrev
        ? `${done >= donePrev ? "+" : "−"}${Math.round((Math.abs(done - donePrev) / donePrev) * 100)}% vs ${prevName}`
        : `${donePrev} in ${prevName}`,
    };
  }, [bookings, today, now, weekStart]);

  const open = openId ? bookings.find((b) => b.id === openId) : undefined;
  const carName = (b: Booking) => (b.carId ? cars.find((x) => x.id === b.carId)?.name : undefined) ?? (b.car || "Any car");

  const clearSearch = () => {
    setQuery("");
    setParams({ q: null });
  };
  const clearFilters = () => {
    clearSearch();
    setParams({ status: null, source: null, from: null, to: null });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* KPI cards — hidden while searching (Figma 3.4) */}
      {!q && (
        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          <Stat label="New, not contacted" value={stats.fresh} hint="Reply within 15 min" highlight={stats.fresh > 0} />
          <Stat label="Pickups today" value={stats.pickups} hint={stats.pickupHint} />
          <Stat label="Confirmed this week" value={stats.confirmedWeek} hint={stats.quotedWeek} />
          <Stat label={`Completed in ${stats.monthName}`} value={stats.done} hint={stats.doneHint} />
        </div>
      )}

      {/* Filters: status tabs · search · pickup date */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-gray-100 bg-layer p-1 [scrollbar-width:none]"
          role="tablist"
          aria-label="Filter by status"
        >
          {(["all", ...BOOKING_STATUSES] as StatusFilter[]).map((f) => {
            const on = status === f;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setParams({ status: f })}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.75 transition-colors ${on ? "bg-inverse" : "hover:bg-layer-hover"}`}
              >
                <span className={`type-ui ${on ? "text-inverse" : "text-primary"}`}>{f === "all" ? "All" : STATUS_LABELS[f]}</span>
                <span className={`type-body-sm ${on ? "text-secondary-inverse" : "text-secondary"}`}>{counts[f]}</span>
              </button>
            );
          })}
        </div>
        <span className="hidden flex-1 xl:block" />
        <label
          className={`flex min-w-0 flex-1 items-center gap-2 rounded-full bg-layer px-3.5 py-2.5 text-[var(--icon-secondary)] focus-within:border-[1.5px] focus-within:border-brand sm:flex-none sm:w-60 ${
            q ? "border-[1.5px] border-brand" : "border border-gray-200"
          }`}
        >
          <Icon name="magnifying-glass" size={16} />
          <span className="sr-only">Search bookings</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setParams({ q: e.target.value });
            }}
            placeholder="Search name, phone or place"
            className="min-w-0 flex-1 bg-transparent type-body-sm text-primary placeholder:text-secondary [&::-webkit-search-cancel-button]:hidden"
            style={{ outline: "none" }} // the brand border on the pill shows focus
          />
        </label>
        <label className="relative flex shrink-0 items-center rounded-full border border-gray-200 bg-layer hover:bg-layer-hover">
          <span className="sr-only">Pickup date</span>
          <select
            value={preset?.id ?? "custom"}
            onChange={(e) => {
              const p = presets.find((x) => x.id === e.target.value);
              if (p) setParams({ from: p.from || null, to: p.to || null });
            }}
            className="absolute inset-0 cursor-pointer appearance-none opacity-0"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                Pickup: {p.label}
              </option>
            ))}
            {!preset && <option value="custom">Pickup: {dateLabel}</option>}
          </select>
          <span className="pointer-events-none flex items-center gap-2 py-2.5 pl-3.5 pr-3 type-ui text-primary" aria-hidden="true">
            Pickup: {dateLabel}
            <Icon name="caret-down" size={16} className="text-[var(--icon-secondary)]" />
          </span>
        </label>
      </div>

      {/* Table (cards below lg) */}
      <div className={`overflow-hidden ${cardCls}`}>
        <div className={`hidden gap-4 bg-layer-accent px-5 py-2.5 type-body-sm text-secondary lg:grid ${COLS}`}>
          <span>Customer</span>
          <span>Trip</span>
          <span>Pickup</span>
          <span>Car</span>
          <span className="hidden xl:block">Source</span>
          <span>Status</span>
          <span />
        </div>
        {bookings.length === 0 ? (
          <Empty title="No bookings yet">
            Requests from the site&rsquo;s booking widget and form appear here the moment a visitor sends one. Use &ldquo;Add phone booking&rdquo; for trips taken
            by phone or WhatsApp.
          </Empty>
        ) : visible.length === 0 ? (
          q ? (
            <Empty title={`No bookings match “${q}”`} action={<button type="button" onClick={clearSearch} className={btnGhost}>Clear search</button>}>
              Try a phone number, a customer name or another place. Cancelled requests are under the Cancelled tab.
            </Empty>
          ) : (
            <Empty title="No bookings in this view" action={<button type="button" onClick={clearFilters} className={btnGhost}>Clear filters</button>}>
              Nothing matches this status and pickup date.
            </Empty>
          )
        ) : (
          <ul>
            {visible.map((b) => (
              <li key={b.id} className="border-b border-gray-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setParams({ id: b.id }, "push")}
                  className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 text-left transition-colors hover:bg-hover lg:gap-y-0 ${COLS} ${
                    openId === b.id || highlight === b.id ? "bg-hover" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate type-ui text-primary">{b.name || "Unnamed"}</span>
                    <span className="block truncate type-body-sm text-secondary">{b.phone || "No phone"}</span>
                  </span>
                  <span className="col-start-2 row-start-1 lg:hidden">
                    <StatusBadge status={b.status} />
                  </span>
                  <span className="col-span-2 min-w-0 lg:col-span-1">
                    <span className="block truncate type-ui text-primary">{route(b)}</span>
                    <span className="block truncate type-body-sm text-secondary">{b.service}</span>
                  </span>
                  <span className="col-span-2 min-w-0 lg:col-span-1">
                    <span className="type-ui text-primary lg:block">{fmtDate(b.date)}</span>
                    <span className="type-body-sm text-secondary lg:block">
                      <span className="lg:hidden"> · </span>
                      {b.time ? fmtTime(b.time) : "Time not set"}
                    </span>
                    <span className="type-body-sm text-secondary lg:hidden"> · {carName(b)}</span>
                  </span>
                  <span className="hidden truncate type-ui text-primary lg:block">{carName(b)}</span>
                  <span className="hidden truncate type-mono-sm text-secondary xl:block">{sourceId(b)}</span>
                  <span className="hidden lg:block">
                    <StatusBadge status={b.status} />
                  </span>
                  <span className="hidden text-[var(--icon-secondary)] lg:flex">
                    <Icon name="caret-down" size={16} className="-rotate-90" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {visible.length > 0 && visible.length < bookings.length && (
        <p className="-mt-3 type-body-sm text-helper">
          Showing {visible.length} of {bookings.length}
        </p>
      )}

      {open && (
        <BookingPanel
          key={open.id}
          booking={open}
          cars={cars}
          journaled={journaled.includes(open.id)}
          onClose={() => setParams({ id: null })}
          onDone={(message) => {
            setParams({ id: null });
            setToast(message);
          }}
        />
      )}
      {openId && !open && <Toast onClose={() => setParams({ id: null })}>That booking no longer exists.</Toast>}
      {toast && !openId && <Toast onClose={() => setToast(null)}>{toast}</Toast>}
    </div>
  );
}

// Figma 3.4 empty state, inside the table card.
function Empty({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-5 py-20 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-layer-accent text-[var(--icon-primary)]">
        <Icon name="magnifying-glass" size={24} />
      </span>
      <p className="type-h4 text-primary">{title}</p>
      {children && <p className="max-w-3xl type-body-sm text-secondary">{children}</p>}
      {action}
    </div>
  );
}

// Figma "Toast": confirmation after a save (light surface, elevation/03).
function Toast({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-30 flex items-center gap-3 rounded-lg border border-gray-100 bg-layer py-3 pl-3.5 pr-3 drop-shadow-[0_16px_24px_var(--shadow-md)] [animation:pop_.15s_ease-out] sm:inset-x-auto sm:bottom-8 sm:right-10"
    >
      <span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-brand text-on-color">
        <Icon name="check" size={14} />
      </span>
      <p className="min-w-0 flex-1 type-ui text-primary">{children}</p>
      <span className="h-5 w-px shrink-0 bg-gray-200" />
      <button type="button" onClick={onClose} aria-label="Dismiss" className="grid shrink-0 place-items-center text-[var(--icon-primary)]">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
