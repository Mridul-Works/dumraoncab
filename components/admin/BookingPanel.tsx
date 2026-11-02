"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { assignBooking, cancelBooking, removeBooking, saveBookingDetails, type AssignInput } from "@/app/admin/actions";
import { fmtClock, fmtLongDate, fmtReceived, fmtTime, fmtWhen, hasDriver, pdfHref, sourceId } from "@/components/admin/BookingFormat";
import ContactLinks, { customerMessage, waHref } from "@/components/admin/ContactLinks";
import Drawer from "@/components/admin/Drawer";
import Icon from "@/components/admin/Icon";
import { FormError, StatusBadge, btnDanger, btnGhost, btnPrimary, btnText, inputCls, labelCls } from "@/components/admin/ui";
import { STATUS_LABELS, STATUS_STEPS, phoneDigits, type Booking, type BookingStatus } from "@/lib/bookingTypes";
import { inr, type CarType } from "@/lib/catalogTypes";
import { cancelReasons, customerCancelText } from "@/lib/site";

export type CarOption = { id: string; name: string; number: string; type: CarType; seats?: string };

// Approved vendors offered in "Assign car and driver" (Figma 3.6).
export type VendorOption = {
  id: string;
  name: string;
  mobile: string;
  rating?: number;
  trips?: number;
  cars: { id: string; model: string; number: string; seats: number }[];
};

export type ToastMsg = { text: string; action?: { label: string; href: string } };

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
  busy,
  onTrack,
}: {
  status?: BookingStatus;
  className: string;
  children: React.ReactNode;
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
      onClick={() => onTrack(status)}
      className={className}
    >
      {children}
    </button>
  );
}

// Figma "Radio" (18px control) — the images are the design's own control states.
function RadioMark({ on }: { on: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- two-tone control SVG from the design
    <img src={on ? "/admin-icons/radio-on-18.svg" : "/admin-icons/radio-off-18.svg"} alt="" width={18} height={18} className="mt-px size-4.5 shrink-0" />
  );
}

const tagCls = { green: "bg-tag-green text-brand", amber: "bg-tag-amber text-tag-amber", gray: "bg-gray-50 text-secondary" } as const;
function Tag({ tone, children }: { tone: keyof typeof tagCls; children: React.ReactNode }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 type-body-sm ${tagCls[tone]}`}>{children}</span>;
}

// Opens WhatsApp to the customer with the quote / confirmation / driver details.
export function WhatsAppDetails({ booking, office, className, onPick }: { booking: Booking; office: string; className: string; onPick?: () => void }) {
  const href = waHref(booking.phone, customerMessage(booking, office));
  if (!href) return <span className={`${className} pointer-events-none text-helper`}>No valid phone for WhatsApp</span>;
  return (
    <a role="menuitem" href={href} target="_blank" rel="noreferrer" className={className} onClick={onPick}>
      <Icon name="whatsapp-logo" size={18} />
      Send on WhatsApp
    </a>
  );
}

// Figma 3.2 "Booking detail": trip facts, status steps, quote / car / note,
// and the footer actions that move the booking along. 3.6 swaps the body for
// "Assign car and driver"; 3.7 asks for a cancel reason in a modal.
export default function BookingPanel({
  booking: b,
  cars,
  vendors,
  bookings,
  office,
  journaled,
  onClose,
  onDone,
}: {
  booking: Booking;
  cars: CarOption[];
  vendors: VendorOption[];
  bookings: Booking[]; // all bookings: car availability and saved drivers
  office: string;
  journaled: boolean;
  onClose: () => void;
  onDone: (message: ToastMsg) => void; // after a save: close and show a toast
}) {
  const [deleting, startDelete] = useTransition();
  const [state, save, saving] = useActionState(saveBookingDetails, undefined);
  const [mode, setMode] = useState<"detail" | "assign">("detail");
  const [cancelling, setCancelling] = useState(false);
  const busy = saving || deleting;
  const assigned = cars.find((c) => c.id === b.carId);
  const asked = cars.find((c) => c.name.toLowerCase() === b.car.toLowerCase());
  const vendor = vendors.find((v) => v.id === b.vendorId);
  const vendorCar = vendor?.cars.find((c) => c.id === b.vendorCarId);

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
    doneRef.current({ text: status ? `${name} marked ${STATUS_LABELS[status]}${quoteNote}` : `${name} updated${quoteNote}` });
  }, [state, b.name]);

  const onTrack = (status?: BookingStatus) => {
    const form = document.getElementById(FORM_ID) as HTMLFormElement | null;
    submitted.current = { status, quote: (form?.elements.namedItem("quote") as HTMLInputElement | null)?.value ?? "" };
  };

  const deleteBooking = () => {
    if (!confirm(`Delete this booking from ${b.name || b.from} for good? This can't be undone.`)) return;
    startDelete(async () => {
      await removeBooking(b.id);
      onDone({ text: `${b.name || "Booking"} deleted` });
    });
  };

  const isAssigned = Boolean((b.carId || b.vendorId) && hasDriver(b));
  const save$ = (
    <SubmitStatus busy={busy} onTrack={onTrack} className={`${btnGhost} ${FOOT}`}>
      {saving ? "Saving…" : "Save"}
    </SubmitStatus>
  );
  const cancel$ = (
    <button type="button" disabled={busy} onClick={() => setCancelling(true)} className={`${btnDanger} ${FOOT}`}>
      Cancel booking
    </button>
  );

  const footer = (
    <>
      {b.status === "cancelled" || b.status === "completed" ? (
        <button type="button" disabled={busy} onClick={deleteBooking} className={`${btnDanger} ${FOOT}`}>
          Delete booking
        </button>
      ) : (
        cancel$
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
          {isAssigned ? (
            <SubmitStatus busy={busy} onTrack={onTrack} status="completed" className={`${btnPrimary} ${FOOT}`}>
              <Icon name="check" size={16} />
              Mark completed
            </SubmitStatus>
          ) : (
            <button type="button" disabled={busy} onClick={() => setMode("assign")} className={`${btnPrimary} ${FOOT}`}>
              <Icon name="car-simple" size={16} />
              Assign car and driver
            </button>
          )}
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

  const carLine = vendorCar ? `${vendorCar.model} · ${vendorCar.number}` : assigned ? `${assigned.name}${assigned.number ? ` · ${assigned.number}` : ""}` : b.car;

  return (
    <>
      {mode === "assign" ? (
        <AssignPanel
          booking={b}
          cars={cars}
          vendors={vendors}
          bookings={bookings}
          office={office}
          onBack={() => setMode("detail")}
          onClose={onClose}
          onDone={onDone}
        />
      ) : (
        <Drawer
          title={b.name || "Unnamed customer"}
          badge={<StatusBadge status={b.status} />}
          subtitle={`${b.phone || "No phone"} · received ${fmtReceived(b.createdAt)} via ${sourceId(b)}`}
          actions={<ContactLinks booking={b} office={office} carName={assigned?.name ?? vendorCar?.model} />}
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
              <Row label="Preferred car">{b.car ? `${b.car}${asked?.seats ? ` · ${asked.seats}` : ""}` : "Any car"}</Row>
              {b.people ? <Row label="People">{b.people}</Row> : null}
              <Row label="Customer note">{b.notes || "—"}</Row>
            </dl>

            {(b.status === "confirmed" || b.status === "completed") && (
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="flex-1 type-h4 text-primary">Car and driver</h3>
                  {b.status === "confirmed" && (
                    <button type="button" onClick={() => setMode("assign")} className={btnText}>
                      {isAssigned ? "Change" : "Assign"}
                    </button>
                  )}
                </div>
                {isAssigned ? (
                  <div className="flex flex-col gap-1 rounded-md border border-gray-100 px-3.5 py-3">
                    <p className="type-ui text-primary">{carLine}</p>
                    <p className="type-body-sm text-secondary">
                      {vendor ? "Vendor" : "Driver"} {b.driverName} · {b.driverMobile}
                    </p>
                  </div>
                ) : (
                  <p className="rounded-md bg-gray-50 px-3.5 py-2.5 type-body-sm text-secondary">No car or driver yet. Assign one to send the customer the details.</p>
                )}
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <a href={pdfHref(b.id, "customer")} target="_blank" rel="noreferrer" className={btnText}>
                    <Icon name="file-pdf" size={16} />
                    Customer copy (PDF)
                  </a>
                  <a href={pdfHref(b.id, "driver")} target="_blank" rel="noreferrer" className={btnText}>
                    <Icon name="file-pdf" size={16} />
                    Driver copy (PDF)
                  </a>
                </div>
              </section>
            )}

            <h3 className="type-h4 text-primary">Status</h3>
            {b.status === "cancelled" && (
              <p className="-mt-2 rounded-md bg-tag-red px-3.5 py-2.5 type-body-sm text-tag-red">
                This booking was cancelled{b.cancelReason ? ` · ${b.cancelReason}` : ""}. Reopen it to work on it again.
              </p>
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
                <input
                  id="bp-quote"
                  name="quote"
                  inputMode="numeric"
                  defaultValue={b.quote ? b.quote.toLocaleString("en-IN") : ""}
                  placeholder="e.g. 2,799"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="bp-car" className={labelCls}>
                  Car sent
                </label>
                <div className="relative">
                  <select id="bp-car" name="carId" defaultValue={b.carId ?? ""} className={`${inputCls} appearance-none pr-10`}>
                    <option value="">{vendorCar ? `${vendorCar.model} (vendor)` : "Not assigned yet"}</option>
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
      )}
      {cancelling && <CancelModal booking={b} carFreed={Boolean(b.carId || b.vendorId)} onKeep={() => setCancelling(false)} onDone={onDone} />}
    </>
  );
}

/* --------------------------- 3.6 Assign car and driver --------------------------- */

type Choice = { key: string; input: AssignInput; label: string; description: string; free: boolean; tags: React.ReactNode };

function AssignPanel({
  booking: b,
  cars,
  vendors,
  bookings,
  office,
  onBack,
  onClose,
  onDone,
}: {
  booking: Booking;
  cars: CarOption[];
  vendors: VendorOption[];
  bookings: Booking[];
  office: string;
  onBack: () => void;
  onClose: () => void;
  onDone: (message: ToastMsg) => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  // Other live trips the same day hold a car.
  const busyAt = useMemo(() => {
    const live = bookings.filter((x) => x.id !== b.id && b.date && x.date === b.date && x.status !== "cancelled" && x.status !== "completed");
    return (match: (x: Booking) => boolean) =>
      live
        .filter(match)
        .map((x) => (x.time ? fmtClock(x.time) : "time not set"))
        .join(", ");
  }, [bookings, b.id, b.date]);

  // The last driver who took each of our cars, so staff needn't retype them.
  const savedDriver = useMemo(() => {
    const map = new Map<string, { name: string; mobile: string }>();
    const byRecent = [...bookings].sort((x, y) => (y.updatedAt ?? y.createdAt).localeCompare(x.updatedAt ?? x.createdAt));
    for (const x of byRecent) {
      if (x.carId && !x.vendorId && x.driverName && x.driverMobile && !map.has(x.carId)) map.set(x.carId, { name: x.driverName, mobile: x.driverMobile });
    }
    if (b.carId && !b.vendorId && b.driverName && b.driverMobile) map.set(b.carId, { name: b.driverName, mobile: b.driverMobile });
    return map;
  }, [bookings, b]);

  const own: Choice[] = cars
    .map((c) => {
      const busy = busyAt((x) => x.carId === c.id);
      const driver = savedDriver.get(c.id);
      return {
        key: `own:${c.id}`,
        input: { kind: "own" as const, carId: c.id, driverName: driver?.name ?? "", driverMobile: driver?.mobile ?? "" },
        label: c.number ? `${c.name} · ${c.number}` : c.name,
        description: driver ? `Driver ${driver.name} · ${driver.mobile}` : "No driver saved for this car yet",
        free: !busy,
        tags: (
          <>
            {busy ? <Tag tone="amber">Booked at {busy}</Tag> : <Tag tone="green">Free</Tag>}
            {c.seats && <Tag tone="gray">{c.seats}</Tag>}
          </>
        ),
      };
    })
    .sort((x, y) => Number(y.free) - Number(x.free));

  const fromVendors: Choice[] = vendors
    .flatMap((v) =>
      v.cars.map((c) => {
        const busy = busyAt((x) => x.vendorCarId === c.id);
        return {
          key: `vendor:${v.id}:${c.id}`,
          input: { kind: "vendor" as const, vendorId: v.id, vendorCarId: c.id },
          label: `${v.name} · ${c.model}`,
          description: [c.seats ? `${c.seats} seats` : "", v.rating ? `${v.rating} rating` : "", v.trips ? `${v.trips} trips` : ""].filter(Boolean).join(" · "),
          free: !busy,
          tags: (
            <>
              {busy ? <Tag tone="amber">Booked at {busy}</Tag> : <Tag tone="green">Free</Tag>}
              {c.number && <Tag tone="gray">{c.number}</Tag>}
            </>
          ),
        };
      }),
    )
    .sort((x, y) => Number(y.free) - Number(x.free));

  const current = b.vendorId ? `vendor:${b.vendorId}:${b.vendorCarId}` : b.carId ? `own:${b.carId}` : "";
  const preferred = own.find((o) => o.free && b.car && o.label.toLowerCase().startsWith(b.car.toLowerCase())) ?? own.find((o) => o.free) ?? fromVendors.find((o) => o.free);
  const all = [...own, ...fromVendors];
  const [pick, setPick] = useState(() => (all.some((o) => o.key === current) ? current : (preferred?.key ?? "")));
  const choice = all.find((o) => o.key === pick);

  // Driver name + mobile for our own cars (prefilled from the last trip).
  const ownInput = choice?.input.kind === "own" ? choice.input : undefined;
  const driverOf = (o?: Choice) => (o?.input.kind === "own" ? { name: o.input.driverName, mobile: o.input.driverMobile } : { name: "", mobile: "" });
  const [driver, setDriver] = useState(() => driverOf(choice));
  const [editDriver, setEditDriver] = useState(() => !driverOf(choice).name);
  const choose = (key: string) => {
    const next = driverOf(all.find((o) => o.key === key));
    setPick(key);
    setDriver(next);
    setEditDriver(!next.name);
    setError(undefined);
  };

  const vendorChoice = choice?.input.kind === "vendor" ? vendors.find((v) => v.id === (choice.input as { vendorId: string }).vendorId) : undefined;
  const driverName = ownInput ? driver.name.trim() : (vendorChoice?.name ?? "");
  const firstName = driverName.split(" ")[0] || "The driver";

  const submit = () => {
    if (!choice) return setError("Choose a car.");
    const input: AssignInput = ownInput ? { ...ownInput, driverName: driver.name, driverMobile: driver.mobile } : choice.input;
    const canMessage = Boolean(phoneDigits(b.phone));
    // Open the WhatsApp tab now (inside the click) so it isn't blocked as a popup.
    const tab = canMessage ? window.open("", "_blank") : null;
    start(async () => {
      const res = await assignBooking(b.id, input);
      if (res.error) {
        tab?.close();
        setError(res.error);
        return;
      }
      const d = phoneDigits(driver.mobile);
      const mobile = ownInput ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : (vendorChoice?.mobile ?? "");
      const carName = ownInput
        ? cars.find((c) => c.id === ownInput.carId)?.name
        : vendorChoice?.cars.find((c) => c.id === (choice.input as { vendorCarId: string }).vendorCarId)?.model;
      const after: Booking = { ...b, status: "confirmed", driverName, driverMobile: mobile, car: carName ?? b.car };
      if (tab) tab.location.href = waHref(b.phone, customerMessage(after, office, "confirm"));
      onDone({
        text: `${driverName} assigned${tab ? " · details sent on WhatsApp" : ""}`,
        action: { label: "Driver copy", href: pdfHref(b.id, "driver") },
      });
    });
  };

  const option = (o: Choice) => {
    const on = pick === o.key;
    return (
      <div
        key={o.key}
        className={`flex flex-col gap-2 rounded-md px-3.5 py-3 transition-colors ${on ? "border-[1.5px] border-brand bg-layer-selected" : "border border-gray-100 bg-layer hover:bg-layer-hover"}`}
      >
        <label className="flex cursor-pointer items-start gap-3">
          <input type="radio" name="assign" value={o.key} checked={on} onChange={() => choose(o.key)} className="sr-only" />
          <RadioMark on={on} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="type-ui text-primary">{o.label}</span>
            {o.description && <span className="type-body-sm text-secondary">{o.description}</span>}
          </span>
        </label>
        <div className="flex flex-wrap gap-1.5 pl-7.5">{o.tags}</div>
        {on && o.input.kind === "own" && (
          <div className="pl-7.5">
            {editDriver ? (
              <div className="grid gap-3 pt-1 sm:grid-cols-2">
                <div>
                  <label htmlFor="as-driver" className={labelCls}>
                    Driver name
                  </label>
                  <input id="as-driver" value={driver.name} onChange={(e) => setDriver({ ...driver, name: e.target.value })} placeholder="e.g. Rakesh Yadav" className={inputCls} />
                </div>
                <div>
                  <label htmlFor="as-mobile" className={labelCls}>
                    Driver mobile
                  </label>
                  <input
                    id="as-mobile"
                    inputMode="tel"
                    value={driver.mobile}
                    onChange={(e) => setDriver({ ...driver, mobile: e.target.value })}
                    placeholder="98351 22408"
                    className={inputCls}
                  />
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setEditDriver(true)} className={btnText}>
                Change driver
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Drawer
      title={b.name || "Unnamed customer"}
      badge={<StatusBadge status={b.status} />}
      subtitle={`${b.phone || "No phone"} · received ${fmtReceived(b.createdAt)} via ${sourceId(b)}`}
      actions={<ContactLinks booking={b} office={office} />}
      onClose={onClose}
      footer={
        <>
          <span className="flex-1" />
          <button type="button" onClick={onBack} disabled={pending} className={btnGhost}>
            Back
          </button>
          <button type="button" onClick={submit} disabled={pending || !choice} className={btnPrimary}>
            <Icon name="check" size={16} />
            {pending ? "Assigning…" : "Assign and send details"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5.5 px-5 py-5.5 md:px-7">
        <h3 className="type-h4 text-primary">Trip</h3>
        <dl className="-mt-2">
          <Row label="Service">{b.service || "—"}</Row>
          <Row label="Pickup">{b.from || "—"}</Row>
          <Row label="Drop">{b.to || "—"}</Row>
        </dl>

        <section className="flex flex-col gap-3" role="radiogroup" aria-label="Car and driver">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="flex-1 whitespace-nowrap type-h3 text-primary">Assign car and driver</h3>
            {b.car && <p className="type-body-sm text-secondary">Customer asked for {b.car}</p>}
          </div>
          <p className="type-body-sm text-secondary">Our cars</p>
          {own.length ? own.map(option) : <p className="type-body-sm text-helper">No cars in the fleet yet.</p>}
          <p className="type-body-sm text-secondary">Approved vendors</p>
          {fromVendors.length ? fromVendors.map(option) : <p className="type-body-sm text-helper">No approved vendors with a car yet.</p>}
          <p className="rounded-md bg-gray-50 px-3.5 py-2.5 type-body-sm text-secondary">
            Customer gets the driver name, number and car on WhatsApp. {firstName} gets the trip slip (driver copy).
          </p>
          <FormError error={error} />
        </section>
      </div>
    </Drawer>
  );
}

/* ------------------------------ 3.7 Cancel booking ------------------------------ */

function CancelModal({ booking: b, carFreed, onKeep, onDone }: { booking: Booking; carFreed: boolean; onKeep: () => void; onDone: (message: ToastMsg) => void }) {
  const [reason, setReason] = useState(cancelReasons[0]);
  const canMessage = Boolean(phoneDigits(b.phone));
  const [tell, setTell] = useState(canMessage);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const day = fmtWhen({ date: b.date, time: "" });
  const message = customerCancelText(day);
  const keepRef = useRef(onKeep);
  useEffect(() => {
    keepRef.current = onKeep;
  });

  // Esc closes this modal only, not the drawer underneath.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      keepRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const confirmCancel = () => {
    const tab = tell ? window.open("", "_blank") : null;
    start(async () => {
      const res = await cancelBooking(b.id, reason);
      if (res.error) {
        tab?.close();
        setError(res.error);
        return;
      }
      if (tab) tab.location.href = waHref(b.phone, message);
      onDone({ text: `${b.name || "Booking"} marked Cancelled${tab ? " · customer told on WhatsApp" : ""}` });
    });
  };

  const trip = b.to ? `${b.from} to ${b.to}` : b.from;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button type="button" aria-label="Keep booking" onClick={onKeep} className="absolute inset-0 cursor-default bg-scrim [animation:fade_.15s_ease-out]" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
        className="relative flex w-full max-w-125 flex-col gap-4 rounded-lg bg-layer p-7 shadow-[0_16px_48px_var(--shadow-md)] [animation:pop_.15s_ease-out]"
      >
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-tag-red text-tag-red">
            <Icon name="x" size={22} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2 id="cancel-title" className="type-h4 text-primary">
              Cancel {b.name ? `${b.name}’s` : "this"} booking?
            </h2>
            <p className="type-body-sm text-secondary">
              {[fmtWhen(b), trip].filter(Boolean).join(" · ")}.{carFreed ? " The car is freed for other bookings." : ""}
            </p>
          </div>
        </div>
        <p className="type-ui text-primary" id="cancel-reason">
          Reason
        </p>
        <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby="cancel-reason">
          {cancelReasons.map((r) => (
            <label key={r} className="flex cursor-pointer items-start gap-3">
              <input type="radio" name="cancel-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="sr-only" />
              <RadioMark on={reason === r} />
              <span className="type-ui text-primary">{r}</span>
            </label>
          ))}
        </div>
        {canMessage && (
          <div className="flex items-center gap-3 rounded-md bg-gray-50 px-3.5 py-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="type-ui text-primary">Tell the customer on WhatsApp</p>
              <p className="type-body-sm text-secondary">“{message}”</p>
            </div>
            <button type="button" role="switch" aria-checked={tell} aria-label="Tell the customer on WhatsApp" onClick={() => setTell(!tell)} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- toggle SVG from the design */}
              <img src={tell ? "/admin-icons/toggle-on.svg" : "/admin-icons/toggle-off.svg"} alt="" width={36} height={20} className="block h-5 w-9" />
            </button>
          </div>
        )}
        <FormError error={error} />
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onKeep} disabled={pending} className={btnGhost}>
            Keep booking
          </button>
          <button type="button" onClick={confirmCancel} disabled={pending} className={btnDanger}>
            {pending ? "Cancelling…" : "Cancel booking"}
          </button>
        </div>
      </div>
    </div>
  );
}
