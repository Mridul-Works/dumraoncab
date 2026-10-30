"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { removeBooking, saveBookingDetails } from "@/app/admin/actions";
import { fmtLongDate, fmtReceived, fmtTime, sourceId } from "@/components/admin/BookingFormat";
import ContactLinks from "@/components/admin/ContactLinks";
import Drawer from "@/components/admin/Drawer";
import Icon from "@/components/admin/Icon";
import { FormError, StatusBadge, btnDanger, btnGhost, btnPrimary, inputCls, labelCls } from "@/components/admin/ui";
import { STATUS_LABELS, STATUS_STEPS, type Booking, type BookingStatus } from "@/lib/bookingTypes";
import { inr, type CarType } from "@/lib/catalogTypes";

export type CarOption = { id: string; name: string; number: string; type: CarType; seats?: string };

const FORM_ID = "booking-drawer-form";
// Footer buttons: a little tighter than the default pill so three fit in 540px.
const FOOT = "px-4!";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-gray-100 py-2.25">
      <dt className="w-28 shrink-0 type-body-sm text-secondary sm:w-35">{label}</dt>
      <dd className="min-w-0 flex-1 whitespace-pre-wrap type-ui text-primary">{children}</dd>
    </div>
  );
}

// Submit button for the drawer form; it may sit in the footer, outside the form.
function SubmitStatus({
  status,
  className,
  children,
  ask,
  busy,
  onTrack,
}: {
  status?: BookingStatus;
  className: string;
  children: React.ReactNode;
  ask?: string;
  busy: boolean;
  onTrack: (status?: BookingStatus) => void;
}) {
  return (
    <button
      type="submit"
      form={FORM_ID}
      name={status ? "setStatus" : undefined}
      value={status}
      disabled={busy}
      onClick={(e) => {
        if (ask && !confirm(ask)) {
          e.preventDefault();
          return;
        }
        onTrack(status);
      }}
      className={className}
    >
      {children}
    </button>
  );
}

// Figma 3.2 "Booking detail": trip facts, status steps, quote / car / note,
// and the footer actions that move the booking along.
export default function BookingPanel({
  booking: b,
  cars,
  journaled,
  onClose,
  onDone,
}: {
  booking: Booking;
  cars: CarOption[];
  journaled: boolean;
  onClose: () => void;
  onDone: (message: string) => void; // after a save: close and show a toast
}) {
  const [deleting, startDelete] = useTransition();
  const [state, save, saving] = useActionState(saveBookingDetails, undefined);
  const busy = saving || deleting;
  const assigned = cars.find((c) => c.id === b.carId);
  const asked = cars.find((c) => c.name.toLowerCase() === b.car.toLowerCase());

  // Remember which button submitted, to word the toast.
  const submitted = useRef<{ status?: BookingStatus; quote: string }>({ quote: "" });
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });
  useEffect(() => {
    if (!state?.ok) return;
    const { status, quote } = submitted.current;
    const name = b.name || "Booking";
    const amount = Number(quote.replace(/[₹,\s]/g, ""));
    const quoteNote = amount > 0 ? ` · ${inr(amount)} quote saved` : "";
    doneRef.current(status ? `${name} marked ${STATUS_LABELS[status]}${quoteNote}` : `${name} updated${quoteNote}`);
  }, [state, b.name]);

  const onTrack = (status?: BookingStatus) => {
    const form = document.getElementById(FORM_ID) as HTMLFormElement | null;
    submitted.current = { status, quote: (form?.elements.namedItem("quote") as HTMLInputElement | null)?.value ?? "" };
  };

  const deleteBooking = () => {
    if (!confirm(`Delete this booking from ${b.name || b.from} for good? This can't be undone.`)) return;
    startDelete(async () => {
      await removeBooking(b.id);
      onDone(`${b.name || "Booking"} deleted`);
    });
  };

  const cancelAsk = `Cancel the booking for ${b.name || b.from}?`;
  const save$ = (
    <SubmitStatus busy={busy} onTrack={onTrack} className={`${btnGhost} ${FOOT}`}>{saving ? "Saving…" : "Save"}</SubmitStatus>
  );

  const footer = (
    <>
      {b.status === "cancelled" || b.status === "completed" ? (
        <button type="button" disabled={busy} onClick={deleteBooking} className={`${btnDanger} ${FOOT}`}>
          Delete booking
        </button>
      ) : (
        <SubmitStatus busy={busy} onTrack={onTrack} status="cancelled" ask={cancelAsk} className={`${btnDanger} ${FOOT}`}>
          Cancel booking
        </SubmitStatus>
      )}
      <span className="flex-1" />
      {b.status === "new" && (
        <>
          <SubmitStatus busy={busy} onTrack={onTrack} status="contacted" className={`${btnGhost} ${FOOT}`}>
            Mark contacted
          </SubmitStatus>
          <SubmitStatus busy={busy} onTrack={onTrack} status="confirmed" className={`${btnPrimary} ${FOOT}`}>
            <Icon name="check" size={16} />
            Mark confirmed
          </SubmitStatus>
        </>
      )}
      {b.status === "contacted" && (
        <>
          {save$}
          <SubmitStatus busy={busy} onTrack={onTrack} status="confirmed" className={`${btnPrimary} ${FOOT}`}>
            <Icon name="check" size={16} />
            Mark confirmed
          </SubmitStatus>
        </>
      )}
      {b.status === "confirmed" && (
        <>
          {save$}
          <SubmitStatus busy={busy} onTrack={onTrack} status="completed" className={`${btnPrimary} ${FOOT}`}>
            <Icon name="check" size={16} />
            Mark completed
          </SubmitStatus>
        </>
      )}
      {b.status === "completed" && (
        <>
          {save$}
          {!journaled && (
            <Link href={`/admin/journal?new=1&booking=${b.id}`} className={`${btnPrimary} ${FOOT}`}>
              <Icon name="notebook" size={16} />
              Add to journal
            </Link>
          )}
        </>
      )}
      {b.status === "cancelled" && (
        <SubmitStatus busy={busy} onTrack={onTrack} status="new" className={`${btnGhost} ${FOOT}`}>
          Reopen
        </SubmitStatus>
      )}
    </>
  );

  return (
    <Drawer
      title={b.name || "Unnamed customer"}
      badge={<StatusBadge status={b.status} />}
      subtitle={`${b.phone || "No phone"} · received ${fmtReceived(b.createdAt)} via ${sourceId(b)}`}
      actions={<ContactLinks booking={b} carName={assigned?.name} />}
      onClose={onClose}
      footer={footer}
    >
      {/* Remount after each save so the fields show the saved values. */}
      <form id={FORM_ID} key={b.updatedAt ?? "new"} action={save} className="flex flex-col gap-5.5 px-5 py-5.5 md:px-7">
        <input type="hidden" name="id" value={b.id} />
        <input type="hidden" name="people" value={b.people ?? ""} />

        <h3 className="type-h4 text-primary">Trip</h3>
        <dl className="-mt-2">
          <Row label="Service">{b.service || "—"}</Row>
          <Row label="Pickup">{b.from || "—"}</Row>
          <Row label="Drop">{b.to || "—"}</Row>
          <Row label="Date and time">
            {fmtLongDate(b.date)}
            {b.time ? ` · ${fmtTime(b.time)}` : ""}
          </Row>
          <Row label="Preferred car">
            {b.car ? `${b.car}${asked?.seats ? ` · ${asked.seats}` : ""}` : "Any car"}
          </Row>
          {b.people ? <Row label="People">{b.people}</Row> : null}
          <Row label="Customer note">{b.notes || "—"}</Row>
        </dl>

        <h3 className="type-h4 text-primary">Status</h3>
        {b.status === "cancelled" && (
          <p className="-mt-2 rounded-md bg-tag-red px-3.5 py-2.5 type-body-sm text-tag-red">This booking was cancelled. Reopen it to work on it again.</p>
        )}
        <div className="-mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="group" aria-label="Booking status">
          {STATUS_STEPS.map((s) => {
            const current = b.status === s;
            return (
              <button
                key={s}
                type="submit"
                name="setStatus"
                value={s}
                disabled={busy || current}
                aria-pressed={current}
                onClick={() => onTrack(s)}
                className={`rounded-md py-2.25 type-ui transition-colors ${
                  current ? "bg-inverse text-inverse" : "bg-layer-accent text-secondary hover:bg-[var(--layer-accent-hover)] hover:text-primary"
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="bp-quote" className={labelCls}>
              Quoted fare (₹)
            </label>
            <input id="bp-quote" name="quote" inputMode="numeric" defaultValue={b.quote ? b.quote.toLocaleString("en-IN") : ""} placeholder="e.g. 2,799" className={inputCls} />
          </div>
          <div>
            <label htmlFor="bp-car" className={labelCls}>
              Car sent
            </label>
            <div className="relative">
              <select id="bp-car" name="carId" defaultValue={b.carId ?? ""} className={`${inputCls} appearance-none pr-10`}>
                <option value="">Not assigned yet</option>
                {cars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.number ? ` · ${c.number}` : ""}
                  </option>
                ))}
              </select>
              <Icon name="caret-down" size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--icon-secondary)]" />
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="bp-note" className={labelCls}>
            Internal note
          </label>
          <textarea
            id="bp-note"
            name="adminNote"
            maxLength={1000}
            defaultValue={b.adminNote ?? ""}
            placeholder="Driver assigned, advance received, pickup landmark…"
            className={`${inputCls} h-24 resize-y`}
          />
        </div>
        <FormError error={state?.error} />
      </form>
    </Drawer>
  );
}
