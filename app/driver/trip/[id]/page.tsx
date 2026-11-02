import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { bookingRef } from "@/components/admin/BookingFormat";
import {
  ArrivedWhatsApp,
  Checklist,
  EndForm,
  ExpenseButton,
  FixForm,
  HelpButton,
  LocationWatch,
  NotComing,
  OutboxSync,
  PaymentForm,
  SendForm,
  StartForm,
  WaitTimer,
} from "@/components/driver/Trip";
import { clockOf, dayChip, fmtDay, fmtTime, inr, num, respectful } from "@/components/driver/format";
import { lastOdometer } from "@/components/driver/rules";
import { Art, Banner, Body, btnClass, CheckLine, Divider, Facts, LinkBtn, Notice, Route, Screen, Spacer, SummaryRow, Tag, TopBar } from "@/components/driver/ui";
import { arrived, onBoard } from "@/app/driver/actions";
import { FREE_WAIT_MINUTES, getMyBooking, listMyBookings, officeContact, requireApproved, routeDistance } from "@/lib/driverTrips";
import { getEntry } from "@/lib/journal";
import { phoneDigits, type Booking } from "@/lib/bookingTypes";
import { driverChecklist, site } from "@/lib/site";

export const metadata: Metadata = { title: "Trip" };

const mapsTo = (place: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`;
const duration = (from?: string, to?: string) => {
  if (!from || !to) return "—";
  const mins = Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 60000));
  return mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
};
const minutesUntil = (iso: string) => Math.round((Date.parse(iso) - Date.now()) / 60000);
const capital = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

// One page for a whole trip; the screen follows the trip's stage (Figma 10.22–10.39).
export default async function TripPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> }) {
  const [{ id }, { step }] = await Promise.all([params, searchParams]);
  const { vendor } = await requireApproved();
  const b = await getMyBooking(id, vendor.id);
  if (!b) notFound();
  const t = b.trip;
  if (b.status === "cancelled" || !t || t.stage === "offered" || t.stage === "declined") redirect("/driver/today");

  const office = await officeContact();
  const help = <HelpButton officeTel={office.tel} officeDisplay={office.display} />;
  const ref = bookingRef(b);
  const customer = respectful(b.name);
  const phone = phoneDigits(b.phone);
  const tel = phone ? `tel:+91${phone}` : undefined;

  /* ---- after Send to office ---- */
  if (t.sentAt) {
    const entry = t.entryId ? await getEntry(t.entryId) : undefined;
    if (entry?.status === "fix") return <Fix b={b} reason={entry.fixReason} note={entry.fixNote} at={entry.reviewedAt} />;
    return <Done b={b} />;
  }

  /* ---- 10.22 Trip details · 10.23 Start trip ---- */
  if (t.stage === "accepted") {
    if (step === "start") {
      const last = lastOdometer(await listMyBookings(vendor.id), b.vendorCarId, b.id);
      return (
        <Screen>
          <Body>
            <TopBar title="Start trip" back={`/driver/trip/${id}`} />
            <StartForm id={id} last={last} />
          </Body>
        </Screen>
      );
    }
    const mins = minutesUntil(`${b.date}T${b.time || "00:00"}:00+05:30`);
    const chip = mins > 0 && mins < 180 ? `In ${mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`}` : dayChip(b.date);
    return (
      <Screen>
        <Body>
          <TopBar title={`Trip ${ref}`} back="/driver/today" right={help} />
          <div className="flex flex-col gap-[12px] rounded-lg border border-gray-100 bg-layer p-[18px]">
            <div className="flex items-center justify-between gap-[8px]">
              <p className="type-h3 text-primary">{`${dayChip(b.date) === "Today" || dayChip(b.date) === "Tomorrow" ? dayChip(b.date) : fmtDay(b.date)} · ${fmtTime(b.time)}`}</p>
              <Tag tone="amber">{chip}</Tag>
            </div>
            <Route from={b.from} to={b.to} fromTime={fmtTime(b.time) || undefined} />
            <LinkBtn href={mapsTo(b.from)} variant="secondary" icon="map-pin">
              Navigate to pickup
            </LinkBtn>
          </div>
          <div className="flex flex-col gap-[10px] rounded-lg border border-gray-100 bg-layer p-[18px]">
            <div className="flex items-center gap-[10px]">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="type-ui text-primary">{b.name || "Customer"}</span>
                <span className="type-body-sm text-secondary">{[b.people ? `${b.people} ${b.people === 1 ? "person" : "people"}` : "", b.service].filter(Boolean).join(" · ")}</span>
              </div>
              {tel && (
                <>
                  <a href={tel} aria-label={`Call ${b.name}`} className="grid size-[44px] shrink-0 place-items-center rounded-full border border-gray-200 text-primary">
                    <Icon name="phone" size={20} />
                  </a>
                  <a href={`https://wa.me/91${phone}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${b.name}`} className="grid size-[44px] shrink-0 place-items-center rounded-full border border-gray-200 text-primary">
                    <Icon name="whatsapp-logo" size={20} />
                  </a>
                </>
              )}
            </div>
            {b.notes && <p className="rounded-md bg-gray-50 p-[12px] type-body-sm text-primary">{b.notes}</p>}
          </div>
          <div className="flex flex-col gap-[10px] rounded-lg border border-gray-100 bg-layer p-[18px]">
            <p className="type-ui text-primary">Before you go</p>
            <Checklist items={driverChecklist} />
          </div>
          <Spacer />
          <LinkBtn href={`/driver/trip/${id}?step=start`}>Start trip</LinkBtn>
        </Body>
      </Screen>
    );
  }

  /* ---- 10.25 Going to pickup · 10.26 Location is off ---- */
  if (t.stage === "to-pickup") {
    const go = arrived.bind(null, id);
    return (
      <Screen tone="white">
        <div className="px-[20px] pb-[10px]">
          <TopBar title="Going to pickup" back="/driver/today" right={help} />
        </div>
        <LocationWatch tripId={id} customer={customer} place={b.from.split(",")[0]} />
        <Body className="gap-[14px] pt-[18px] pb-[24px]">
          <div className="flex items-center gap-[12px]">
            <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <p className="type-h3 text-primary">{b.from}</p>
              <p className="type-body-sm text-secondary">{`pickup ${fmtTime(b.time) || "now"}`.replace(/^./, (c) => c.toUpperCase())}</p>
            </div>
            {tel && (
              <a href={tel} aria-label={`Call ${b.name}`} className="grid size-[48px] shrink-0 place-items-center rounded-full border border-gray-200 text-primary">
                <Icon name="phone" size={20} />
              </a>
            )}
          </div>
          <LinkBtn href={mapsTo(b.from)} variant="secondary" icon="map-pin">
            Open in Maps
          </LinkBtn>
          <Spacer />
          <form action={go}>
            <button type="submit" className={btnClass("primary")}>
              I have arrived
            </button>
          </form>
        </Body>
      </Screen>
    );
  }

  /* ---- 10.27 Waiting for customer · 10.28 Customer not coming ---- */
  if (t.stage === "waiting") {
    const since = Date.parse(t.arrivedAt ?? new Date().toISOString());
    const board = onBoard.bind(null, id);
    const text = `Namaste ${customer}, your ${site.name} cab is here at ${b.from}.`;
    return (
      <Screen>
        <Body>
          <TopBar title="At pickup" back="/driver/today" right={help} />
          <WaitTimer since={since} freeMinutes={FREE_WAIT_MINUTES} customer={customer} />
          {phone && <ArrivedWhatsApp id={id} link={`https://wa.me/91${phone}?text=${encodeURIComponent(text)}`} customer={customer} sentAt={t.whatsappAt ? clockOf(t.whatsappAt) : undefined} />}
          {tel && (
            <a href={tel} className={btnClass("secondary")}>
              <Icon name="phone" size={16} />
              {`Call ${customer}`}
            </a>
          )}
          {t.noShowAt && <CheckLine>{`You told the office at ${clockOf(t.noShowAt)}. Wait for their call.`}</CheckLine>}
          <Spacer />
          <NotComing id={id} since={since} customer={customer} tel={tel} />
          <form action={board}>
            <button type="submit" className={btnClass("primary")}>
              Customer is on board
            </button>
          </form>
        </Body>
        <LocationPing id={id} />
      </Screen>
    );
  }

  /* ---- 10.29 On the way · 10.30 Add expense · 10.31 Help ---- */
  if (t.stage === "on-trip" && step !== "end") {
    const lastExpense = t.expenses?.at(-1);
    const dist = await routeDistance(b);
    return (
      <Screen tone="white">
        <div className="px-[20px] pb-[10px]">
          <TopBar title="On the way" back="/driver/today" right={help} />
        </div>
        <LocationWatch tripId={id} customer={customer} place={(b.to || b.from).split(",")[0]} />
        <Body className="gap-[14px] pt-[18px] pb-[24px]">
          <div className="flex flex-col gap-[2px]">
            <p className="type-h3 text-primary">{b.to || "Local trip"}</p>
            <p className="type-body-sm text-secondary">{[dist ? `${dist} trip` : "", t.boardedAt ? `on board since ${clockOf(t.boardedAt)}` : ""].filter(Boolean).join(" · ")}</p>
          </div>
          {b.notes && (
            <span>
              <Tag>{b.notes.length > 60 ? `${b.notes.slice(0, 57)}…` : b.notes}</Tag>
            </span>
          )}
          <div className="flex gap-[10px]">
            <a href={mapsTo(b.to || b.from)} target="_blank" rel="noreferrer" className={`${btnClass("secondary")} flex-1`}>
              <Icon name="map-pin" size={16} />
              Maps
            </a>
            <ExpenseButton id={id} />
          </div>
          {lastExpense && <CheckLine>{`${lastExpense.kind} ${inr(lastExpense.amount)} added at ${lastExpense.at ? clockOf(lastExpense.at) : ""}`}</CheckLine>}
          <Spacer />
          <LinkBtn href={`/driver/trip/${id}?step=end`}>Dropped the customer</LinkBtn>
        </Body>
      </Screen>
    );
  }

  const expenses = (t.expenses ?? []).map((x) => ({
    title: [x.kind, x.note].filter(Boolean).join(" · "),
    detail: x.receipt ? `Receipt added${x.at ? ` · ${clockOf(x.at)}` : ""}` : "No receipt",
    amount: x.amount,
  }));
  const extra = (t.expenses ?? []).reduce((s, x) => s + x.amount, 0);

  /* ---- 10.32 End trip (also edit from 10.36) ---- */
  if (step === "end" || t.stage === "on-trip") {
    const editing = t.stage === "paid";
    return (
      <Screen>
        <Body>
          <TopBar title="End trip" back={editing ? `/driver/trip/${id}?step=send` : `/driver/trip/${id}`} />
          <EndForm id={id} startKm={t.startKm ?? 0} initialKm={t.endKm} hasPhoto={!!t.endPhoto} expenses={expenses} editing={editing} />
        </Body>
      </Screen>
    );
  }

  /* ---- 10.33 Collect payment · 10.34 Not paid yet · 10.35 Cash received ---- */
  if (t.stage === "ended") {
    const fare = b.quote ?? 0;
    const due = fare + extra;
    const parts = [`Trip ${inr(fare)}`, ...(t.expenses ?? []).map((x) => `${x.kind.toLowerCase()} ${inr(x.amount)}`)];
    return (
      <Screen tone="white">
        <Body>
          <TopBar title="Collect payment" back={`/driver/trip/${id}?step=end`} />
          <PaymentForm id={id} due={due} breakdown={parts.join(" + ")} customer={customer} upi={office.upi} payee={site.name} note={`Trip ${ref}`} />
        </Body>
      </Screen>
    );
  }

  /* ---- 10.36 Check and send (stage "paid") ---- */
  const payLine =
    t.payment === "upi" ? `UPI · ${inr(t.collected ?? 0)}` : t.payment === "cash" ? `Cash · ${inr(t.collected ?? 0)}` : "Pay the office later";
  const photos = [t.startPhoto, t.endPhoto].filter(Boolean).length;
  return (
    <Screen>
      <Body>
        <TopBar title="Check and send" back="/driver/today" />
        <TripHeader b={b} />
        <div className="flex flex-col overflow-hidden rounded-md border border-gray-200 bg-layer">
          <SummaryRow
            label="Meter"
            value={`${num(t.startKm ?? 0)} to ${num(t.endKm ?? 0)} km`}
            detail={`${num((t.endKm ?? 0) - (t.startKm ?? 0))} km · ${photos} meter ${photos === 1 ? "photo" : "photos"}`}
            edit={`/driver/trip/${id}?step=end`}
          />
          <Divider />
          <SummaryRow label="Time" value={`${t.startedAt ? clockOf(t.startedAt) : "—"} to ${t.endedAt ? clockOf(t.endedAt) : "—"}`} detail={duration(t.startedAt, t.endedAt)} done />
          <Divider />
          <SummaryRow
            label="Expenses"
            value={inr(extra)}
            detail={
              t.expenses?.length
                ? `${t.expenses.map((x) => `${capital(x.kind.toLowerCase())} ${inr(x.amount)}`).join(", ").replace(/, (\w)/g, (_, c) => `, ${c.toLowerCase()}`)} · ${t.expenses.filter((x) => x.receipt).length} receipts`
                : "None"
            }
            edit={`/driver/trip/${id}?step=end`}
          />
          <Divider />
          <SummaryRow label="Payment" value={payLine} detail={t.paidAt ? (t.payment === "office" ? `Marked at ${clockOf(t.paidAt)}` : `Paid at ${clockOf(t.paidAt)}`) : undefined} done />
          <div className="flex items-center justify-between bg-tag-green px-[16px] py-[12px] text-brand">
            <span className="type-ui">Your share for this trip</span>
            <span className="type-h4">{t.share != null ? inr(t.share) : "Set by the office"}</span>
          </div>
        </div>
        <SendForm id={id} offlineDone={<Done b={b} offline overlay />} />
      </Body>
      <OutboxSync />
    </Screen>
  );
}

function TripHeader({ b }: { b: Booking }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <p className="type-ui text-primary">{`${bookingRef(b)} · ${b.name || "Customer"}`}</p>
      <p className="type-body-sm text-secondary">{`${[b.from.split(",")[0], b.to.split(",")[0]].filter(Boolean).join(" to ")} · ${fmtDay(b.date)}`}</p>
    </div>
  );
}

// Waiting at pickup: keep sending location while the timer runs.
function LocationPing({ id }: { id: string }) {
  return <LocationWatch tripId={id} customer="" place="" silent />;
}

/* ---- 10.37 Trip done · 10.38 No signal ---- */
function Done({ b, offline, overlay }: { b: Booking; offline?: boolean; overlay?: boolean }) {
  const t = b.trip!;
  const content = (
    <Screen>
      <Body>
        {offline && <Banner>No signal. The trip is saved on your phone and sends when you are back online.</Banner>}
        <Spacer />
        <div className="flex flex-col items-center gap-[8px] text-center">
          <Art name="trip-done-illustration" />
          <h1 className="type-h2 text-primary">Trip done</h1>
          <p className="type-body-md text-secondary">
            {offline
              ? "Saved on your phone. Waiting to send to the Trip log."
              : `Sent to the office${t.sentAt ? ` at ${clockOf(t.sentAt)}` : ""}. It joins the Trip log once checked.`}
          </p>
        </div>
        <Facts
          items={[
            { label: "Distance", value: t.endKm != null && t.startKm != null ? `${num(t.endKm - t.startKm)} km` : "—" },
            { label: "Time", value: duration(t.startedAt, t.endedAt) },
            { label: "Your share", value: t.share != null ? inr(t.share) : "—", brand: true },
          ]}
        />
        <Spacer />
        <LinkBtn href="/driver/today">Back to Today</LinkBtn>
      </Body>
      {offline && <OutboxSync />}
    </Screen>
  );
  return overlay ? <div className="fixed inset-0 z-30 overflow-y-auto bg-gray-50">{content}</div> : content;
}

/* ---- 10.39 Office asked to fix ---- */
function Fix({ b, reason, note, at }: { b: Booking; reason?: string; note?: string; at?: string }) {
  const t = b.trip!;
  const idx = Math.max(0, (t.expenses ?? []).findIndex((x) => x.kind.toLowerCase() === "toll"));
  const exp = t.expenses?.[idx];
  const target = reason === "meter" ? "meter" : reason === "receipt" && exp ? `expense:${idx}` : "note";
  const label = target === "meter" ? "Meter photo" : exp ? `${exp.kind} receipt · ${inr(exp.amount)}` : "Note";
  const fine =
    target === "meter" ? "Parking, payment and time are checked" : target === "note" ? "Meter, receipts and payment are checked" : "Meter, parking and payment are checked";
  return (
    <Screen>
      <Body>
        <TopBar title="Fix and send again" back="/driver/today" />
        <Notice title={`From the office${at ? ` · ${clockOf(at)}` : ""}`}>{note || "Please check this trip and send it again."}</Notice>
        <TripHeader b={b} />
        <FixForm id={b.id} target={target} label={label} hint="Tap to take a clear photo" needsPhoto={target !== "note"} footnote={<CheckLine>{fine}</CheckLine>} />
      </Body>
    </Screen>
  );
}
