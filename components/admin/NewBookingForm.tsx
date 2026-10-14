"use client";

import { useActionState, useState } from "react";
import { createBooking } from "@/app/admin/actions";
import { btnGhost, btnPrimary } from "@/components/admin/ui";
import { BOOKING_STATUSES, istDate } from "@/lib/bookingTypes";

const input =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-sand focus:border-amber focus:outline-none";
const label = "mb-1 block text-xs font-semibold text-ink";

// Staff log a trip that came in by phone or direct WhatsApp.
export default function NewBookingForm({ services, cars }: { services: string[]; cars: string[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createBooking, undefined);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={btnPrimary}>
        + Log a booking
      </button>
    );
  }

  return (
    <form action={action} className="w-full rounded-2xl border border-line bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-base font-semibold text-ink">Log a phone / WhatsApp booking</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-khaki hover:text-ink">
          Close
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="nb-name" className={label}>Customer name</label>
          <input id="nb-name" name="name" className={input} />
        </div>
        <div>
          <label htmlFor="nb-phone" className={label}>Phone</label>
          <input id="nb-phone" name="phone" type="tel" inputMode="tel" className={input} />
        </div>
        <div>
          <label htmlFor="nb-service" className={label}>Service *</label>
          <select id="nb-service" name="service" required className={input} defaultValue="">
            <option value="" disabled>Choose…</option>
            {services.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="nb-car" className={label}>Car</label>
          <select id="nb-car" name="car" className={input} defaultValue="">
            <option value="">Any</option>
            {cars.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="nb-from" className={label}>Pickup *</label>
          <input id="nb-from" name="from" required className={input} />
        </div>
        <div>
          <label htmlFor="nb-to" className={label}>Drop</label>
          <input id="nb-to" name="to" className={input} />
        </div>
        <div>
          <label htmlFor="nb-date" className={label}>Travel date</label>
          <input id="nb-date" name="date" type="date" defaultValue={istDate()} className={input} />
        </div>
        <div>
          <label htmlFor="nb-time" className={label}>Time</label>
          <input id="nb-time" name="time" type="time" className={input} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="nb-notes" className={label}>Customer notes</label>
          <input id="nb-notes" name="notes" className={input} />
        </div>
        <div>
          <label htmlFor="nb-admin" className={label}>Internal note</label>
          <input id="nb-admin" name="adminNote" className={input} />
        </div>
        <div>
          <label htmlFor="nb-status" className={label}>Status</label>
          <select id="nb-status" name="status" defaultValue="confirmed" className={`${input} capitalize`}>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : "Save booking"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
          Cancel
        </button>
        {state?.error && <p className="text-sm font-semibold text-red-600" role="alert">{state.error}</p>}
        {state?.ok && !pending && <p className="text-sm font-semibold text-amberdeep" role="status">Saved — it&rsquo;s in the list below.</p>}
      </div>
    </form>
  );
}
