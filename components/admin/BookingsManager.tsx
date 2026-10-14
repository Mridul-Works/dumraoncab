"use client";

import { useMemo, useState, useTransition } from "react";
import { removeBooking, saveBookingNote, setBookingStatus } from "@/app/admin/actions";
import ContactLinks from "@/components/admin/ContactLinks";
import { statusStyle } from "@/components/admin/ui";
import { BOOKING_STATUSES, SOURCE_LABELS, type Booking, type BookingStatus } from "@/lib/bookingTypes";

type Filter = "all" | BookingStatus;
type Sort = "received" | "travel";

const fmtReceived = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function matches(b: Booking, q: string) {
  if (!q) return true;
  const hay = [b.name, b.phone, b.from, b.to, b.service, b.car, b.notes, b.adminNote ?? ""].join(" ").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((word) => hay.includes(word));
}

export default function BookingsManager({ bookings }: { bookings: Booking[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("received");
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: bookings.length, new: 0, confirmed: 0, completed: 0, cancelled: 0 };
    for (const b of bookings) c[b.status]++;
    return c;
  }, [bookings]);

  const visible = useMemo(() => {
    const list = bookings.filter((b) => (filter === "all" || b.status === filter) && matches(b, query.trim()));
    if (sort === "travel") {
      // Soonest travel date first; undated trips at the end.
      list.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999") || a.time.localeCompare(b.time));
    }
    return list;
  }, [bookings, filter, query, sort]);

  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-line p-8 text-center">
        <p className="font-display text-base font-semibold text-ink">No bookings yet</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-khaki">
          Requests sent through the site&rsquo;s booking widget and form appear here the moment a visitor submits one.
          Use &ldquo;Log a booking&rdquo; for trips that came in by phone or WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, place, car, notes…"
          aria-label="Search bookings"
          className="w-full min-w-0 rounded-full border border-line bg-white px-4 py-2 text-sm text-ink placeholder:text-sand focus:border-amber focus:outline-none sm:w-auto sm:max-w-sm sm:flex-1"
        />
        <label className="flex items-center gap-2 text-xs font-semibold text-khaki">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink"
          >
            <option value="received">Newest received</option>
            <option value="travel">Soonest travel date</option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Filter by status">
        {(["all", ...BOOKING_STATUSES] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold capitalize transition-colors ${
              filter === f ? "bg-night text-white" : "border border-line bg-white text-khaki hover:text-ink"
            }`}
          >
            {f} <span className="font-mono opacity-70">{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
        {visible.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-khaki">No bookings match these filters.</p>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                open={openId === b.id}
                onToggle={() => setOpenId(openId === b.id ? null : b.id)}
              />
            ))}
          </ul>
        )}
      </div>
      <p className="mt-2 text-xs text-sand">
        Showing {visible.length} of {bookings.length}
      </p>
    </div>
  );
}

function BookingRow({ booking: b, open, onToggle }: { booking: Booking; open: boolean; onToggle: () => void }) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState(b.adminNote ?? "");
  const noteDirty = note.trim() !== (b.adminNote ?? "").trim();

  return (
    <li className={pending ? "opacity-60" : undefined}>
      <div className="grid gap-3 px-4 py-3.5 md:grid-cols-[1.1fr_1.6fr_0.9fr_auto] md:items-center md:gap-4 md:px-5">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{b.name || "—"}</p>
          <p className="font-mono text-xs text-khaki">{b.phone || "no phone given"}</p>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-ink">
            {b.from} → {b.to || "—"}
          </p>
          <p className="truncate text-xs text-khaki">
            {b.service}
            {b.car ? ` · ${b.car}` : ""}
            <span className="ml-1.5 rounded-full bg-cream px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider">
              {SOURCE_LABELS[b.source] ?? b.source}
            </span>
          </p>
        </div>
        <div className="font-mono text-xs">
          <p className="text-ink">
            {b.date || "No date"}
            {b.time ? ` · ${b.time}` : ""}
          </p>
          <p className="text-sand">rec. {fmtReceived(b.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={b.status}
            disabled={pending}
            onChange={(e) => startTransition(() => setBookingStatus(b.id, e.target.value as BookingStatus))}
            aria-label={`Status for booking from ${b.name || b.from}`}
            className={`rounded-full border-0 px-3 py-1.5 text-xs font-bold capitalize ${statusStyle[b.status]}`}
          >
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-amber hover:text-amberdeep"
          >
            {open ? "Close" : "Details"}
          </button>
        </div>
      </div>

      {open && (
        <div className="grid gap-5 border-t border-line bg-paper px-4 py-4 md:grid-cols-2 md:px-5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-khaki">Service</dt>
            <dd className="text-ink">{b.service}</dd>
            <dt className="text-khaki">Car</dt>
            <dd className="text-ink">{b.car || "Any"}</dd>
            <dt className="text-khaki">Customer notes</dt>
            <dd className="whitespace-pre-wrap text-ink">{b.notes || "—"}</dd>
            <dt className="text-khaki">Received</dt>
            <dd className="font-mono text-xs text-ink">{new Date(b.createdAt).toLocaleString("en-IN")}</dd>
            {b.updatedAt && (
              <>
                <dt className="text-khaki">Last change</dt>
                <dd className="font-mono text-xs text-ink">{new Date(b.updatedAt).toLocaleString("en-IN")}</dd>
              </>
            )}
            <dt className="text-khaki">Contact</dt>
            <dd>
              <ContactLinks booking={b} />
            </dd>
          </dl>

          <div>
            <label htmlFor={`note-${b.id}`} className="mb-1.5 block text-sm font-semibold text-ink">
              Internal note
            </label>
            <textarea
              id={`note-${b.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Driver assigned, fare quoted, advance received…"
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-sand focus:border-amber focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={pending || !noteDirty}
                onClick={() => startTransition(() => saveBookingNote(b.id, note))}
                className="rounded-full bg-night px-4 py-1.5 text-xs font-bold text-white hover:bg-coal disabled:opacity-40"
              >
                Save note
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (confirm(`Delete the booking from ${b.name || b.from}? This can't be undone.`)) {
                    startTransition(() => removeBooking(b.id));
                  }
                }}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Delete booking
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
