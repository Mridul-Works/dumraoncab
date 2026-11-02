"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/admin/Icon";
import {
  addExpense,
  collectPayment,
  customerNotComing,
  endTrip,
  reportLocation,
  resendFixed,
  sendToOffice,
  startTrip,
  whatsappSent,
  type ActionState,
} from "@/app/driver/actions";
import { UploadBox } from "./camera";
import { BigNumber, CheckRow, RadioRow, toNumber } from "./fields";
import { inr, num } from "./format";
import { qrMatrix, upiLink } from "./qr";
import { EXPENSE_KINDS, meterProblem } from "./rules";
import { Sheet } from "./Sheet";
import { Banner, btnClass, CheckLine, Notice, Spacer } from "./ui";

const Err = ({ state }: { state: ActionState }) =>
  state?.error ? (
    <p role="alert" className="type-body-sm text-negative">
      {state.error}
    </p>
  ) : null;

/* ---------------------------------- help ---------------------------------- */

// 10.31 Help — on every trip screen. Two choices only.
export function HelpButton({ officeTel, officeDisplay }: { officeTel: string; officeDisplay: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-[34px] items-center gap-[6px] rounded-full border border-gray-100 bg-layer px-[10px] py-[6px] type-body-sm text-primary">
        <Icon name="phone" size={14} />
        Help
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Need help?">
        <h2 className="type-h3 text-primary">Need help?</h2>
        <a href={officeTel} className={btnClass("secondary")}>
          <Icon name="phone" size={16} />
          {`Call the office · ${officeDisplay}`}
        </a>
        <a href="tel:112" className={btnClass("danger")}>
          Emergency 112
        </a>
        <button type="button" onClick={() => setOpen(false)} className={btnClass("ghost")}>
          Close
        </button>
      </Sheet>
    </>
  );
}

/* --------------------------------- map art --------------------------------- */

// Route sketch from the design (public/driver-art/map). It is a picture, not a
// live map; "Open in Maps" hands over to the phone's maps app.
export function MapArt({ place, faded }: { place: string; faded?: boolean }) {
  const img = (src: string, cls: string) => (
    // eslint-disable-next-line @next/next/no-img-element -- static vector art from the design
    <img src={`/driver-art/map/${src}.svg`} alt="" className={`absolute block max-w-none ${cls}`} />
  );
  return (
    <div className={`relative h-[380px] w-full overflow-hidden bg-layer ${faded ? "opacity-50" : ""}`} aria-hidden="true">
      {img("grid-a", "inset-0 size-full")}
      {img("grid-b", "inset-0 size-full")}
      {img("road", "inset-[47.41%_0_44.93%_0] h-[7.66%] w-full")}
      {img("route", "inset-[22%_23.08%_18%_23.08%] h-[60%] w-[53.84%]")}
      {img("start-ring", "inset-[77.26%_72.31%_13.26%_18.46%] h-[9.48%] w-[9.23%]")}
      {img("start-dot", "inset-[79.63%_74.62%_15.63%_20.77%] h-[4.74%] w-[4.61%]")}
      {img("pin", "inset-[17.79%_20%_73.79%_73.85%] h-[8.42%] w-[6.15%]")}
      {img("pin-dot", "inset-[19.89%_22.05%_78%_75.9%] h-[2.11%] w-[2.05%]")}
      <span className="absolute right-[24px] top-[35.6px] max-w-[60%] truncate rounded-full border border-gray-100 bg-layer px-[10px] py-[4px] type-body-sm text-primary">{place}</span>
    </div>
  );
}

/* -------------------------------- location -------------------------------- */

// 10.26 Location is off — watches the phone's location during a trip and
// sends it to the office about once a minute. The trip works without it.
export function LocationWatch({ tripId, customer, place, silent }: { tripId: string; customer: string; place: string; silent?: boolean }) {
  const [off, setOff] = useState(false);
  const [retry, setRetry] = useState(0);
  const last = useRef(0);

  useEffect(() => {
    if (!navigator.geolocation) {
      const t = setTimeout(() => setOff(true), 0);
      return () => clearTimeout(t);
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setOff(false);
        if (Date.now() - last.current > 60000 && navigator.onLine) {
          last.current = Date.now();
          void reportLocation(tripId, { lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {});
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED || err.code === err.POSITION_UNAVAILABLE) {
          setOff(true);
          void reportLocation(tripId, null).catch(() => {});
        }
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 30000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [tripId, retry]);

  if (silent) return null;
  return (
    <>
      {off && (
        <div className="px-[20px]">
          <Banner
            icon="crosshair"
            action={
              <button type="button" onClick={() => setRetry((n) => n + 1)} className="min-h-[44px] shrink-0 type-ui text-link">
                Turn on
              </button>
            }
          >
            {`Location is off. ${customer} cannot see you coming.`}
          </Banner>
        </div>
      )}
      <MapArt place={place} faded={off} />
    </>
  );
}

/* ---------------------------------- start ---------------------------------- */

// 10.23 Start trip / 10.24 Check the meter
export function StartForm({ id, last }: { id: string; last?: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(startTrip, undefined);
  const [km, setKm] = useState("");
  const [photo, setPhoto] = useState(false);
  const value = toNumber(km);
  const problem = value ? meterProblem(value, last) : null;
  return (
    <form action={action} className="flex flex-1 flex-col gap-[14px]">
      <input type="hidden" name="id" value={id} />
      <h1 className="type-h2 text-primary">Odometer now</h1>
      <p className="type-body-md text-secondary">Type the km shown on the meter before you leave.</p>
      <BigNumber name="km" label="Odometer now, in km" value={km} onChange={setKm} suffix="km" error={!!problem} />
      {problem ? (
        <CheckLine tone="error">{problem}</CheckLine>
      ) : last != null ? (
        <CheckLine>{`Last trip ended at ${num(last)} km`}</CheckLine>
      ) : null}
      <UploadBox
        label="Photo of the meter"
        hint="Needed for the Trip log"
        doneHint={value ? `${num(value)} km` : undefined}
        name="photo"
        camera={{ title: "Photo of the meter", guide: "Fit the meter inside the box so the km can be read." }}
        onPhoto={setPhoto}
      />
      <Err state={state} />
      <Spacer />
      <button type="submit" disabled={pending || !value || !!problem || !photo} className={btnClass("primary")}>
        {pending ? "Starting…" : "Start and go to pickup"}
      </button>
    </form>
  );
}

/* --------------------------------- checklist --------------------------------- */

// 10.22 "Before you go" — a reminder list, nothing is sent.
export function Checklist({ items }: { items: string[] }) {
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false));
  return (
    <div className="flex flex-col gap-[10px]">
      {items.map((it, i) => (
        <CheckRow key={it} label={it} checked={done[i]} onChange={(on) => setDone((d) => d.map((v, k) => (k === i ? on : v)))} />
      ))}
    </div>
  );
}

/* ---------------------------------- waiting ---------------------------------- */

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// 10.27 Waiting for customer — timer against 30 minutes of free waiting.
export function WaitTimer({ since, freeMinutes, customer }: { since: number; freeMinutes: number; customer: string }) {
  const [now, setNow] = useState(since);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.floor((now - since) / 1000));
  const pct = Math.min(100, (secs / (freeMinutes * 60)) * 100);
  const over = secs > freeMinutes * 60;
  return (
    <div className="flex flex-col items-center gap-[4px] rounded-lg border border-gray-100 bg-layer px-[18px] py-[20px] text-center">
      <p className="type-body-sm text-secondary">Waiting for {customer}</p>
      <p className={`type-display-md tabular-nums ${over ? "text-negative" : "text-primary"}`} role="timer" aria-live="off">
        {mmss(secs)}
      </p>
      <p className="type-body-sm text-secondary">Free waiting till {freeMinutes}:00. After that, the office decides.</p>
      <div className="mt-[8px] h-[4px] w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${over ? "bg-negative" : "bg-brand"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// "Sanjay ji got a WhatsApp…": there is no WhatsApp API here, so the driver sends
// it from their own phone in one tap, and the app notes the time.
export function ArrivedWhatsApp({ id, link, customer, sentAt }: { id: string; link: string; customer: string; sentAt?: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-start gap-[10px] px-[12px] py-[4px]">
      <Icon name="whatsapp-logo" size={18} className="mt-px text-brand" />
      {sentAt ? (
        <p className="type-body-sm text-primary">{`${customer} got a WhatsApp at ${sentAt}: your cab is here.`}</p>
      ) : (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          onClick={() => start(() => whatsappSent(id))}
          aria-disabled={pending}
          className="type-body-sm text-link underline-offset-2 hover:underline"
        >
          {`Send ${customer} a WhatsApp: your cab is here.`}
        </a>
      )}
    </div>
  );
}

// 10.28 Customer not coming?
export function NotComing({ id, since, customer, tel }: { id: string; since: number; customer: string; tel?: string }) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(1);
  const [told, setTold] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMinutes(Math.max(1, Math.round((Date.now() - since) / 60000)));
          setOpen(true);
        }}
        className={btnClass("ghost")}
      >
        Customer not coming?
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Customer not coming?" title="Customer not coming?">
        <p className="type-ui text-secondary">
          {`You have waited ${minutes} min. Call ${customer} once more. If there is no answer, tell the office and they will decide.`}
        </p>
        {tel && (
          <a href={tel} className={btnClass("secondary")}>
            <Icon name="phone" size={16} />
            {`Call ${customer}`}
          </a>
        )}
        {told ? (
          <CheckLine>The office knows. Stay here until they call you.</CheckLine>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await customerNotComing(id);
                setTold(true);
              })
            }
            className={btnClass("primary")}
          >
            Tell the office
          </button>
        )}
      </Sheet>
    </>
  );
}

/* --------------------------------- expenses --------------------------------- */

// 10.30 Add expense — toll, parking or fuel, with the receipt photo.
export function ExpenseButton({ id, variant = "half" }: { id: string; variant?: "half" | "link" }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(EXPENSE_KINDS[0]);
  const [amount, setAmount] = useState("");
  const [photo, setPhoto] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const res = await addExpense(prev, fd);
    if (res?.ok) {
      setOpen(false);
      setAmount("");
      setPhoto(false);
    }
    return res;
  }, undefined);
  return (
    <>
      {variant === "half" ? (
        <button type="button" onClick={() => setOpen(true)} className={`${btnClass("secondary")} flex-1`}>
          <Icon name="receipt" size={16} />
          Add expense
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex min-h-[44px] items-center gap-[4px] type-ui text-link">
          <Icon name="plus" size={16} />
          Add
        </button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} label="Add expense" title="Add expense">
        <form action={action} className="flex flex-col gap-[16px]">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="kind" value={kind} />
          <div className="flex gap-[8px]" role="radiogroup" aria-label="Expense type">
            {EXPENSE_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={`min-h-[38px] rounded-full border px-[16px] type-ui ${kind === k ? "border-brand bg-tag-green text-brand" : "border-gray-200 bg-layer text-primary"}`}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-[6px]">
            <span className="type-ui text-primary">Amount</span>
            <BigNumber name="amount" label="Amount in rupees" value={amount} onChange={setAmount} prefix="₹" size="h4" />
          </div>
          <UploadBox label="Receipt photo" hint="Take it now, so nothing is typed from memory" name="receipt" camera={{ title: `${kind} receipt`, guide: "Fit the receipt inside the box." }} onPhoto={setPhoto} />
          <Err state={state} />
          <button type="submit" disabled={pending || !toNumber(amount) || !photo} className={btnClass("primary")}>
            {pending ? "Saving…" : "Save expense"}
          </button>
        </form>
      </Sheet>
    </>
  );
}

/* ----------------------------------- end ----------------------------------- */

export type ExpenseView = { title: string; detail: string; amount: number };

// 10.32 End trip
export function EndForm({
  id,
  startKm,
  initialKm,
  hasPhoto,
  expenses,
  editing,
}: {
  id: string;
  startKm: number;
  initialKm?: number;
  hasPhoto: boolean;
  expenses: ExpenseView[];
  editing: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(endTrip, undefined);
  const [km, setKm] = useState(initialKm ? num(initialKm) : "");
  const [photo, setPhoto] = useState(hasPhoto);
  const value = toNumber(km);
  const run = value - startKm;
  const bad = !!value && run <= 0;
  const total = expenses.reduce((s, x) => s + x.amount, 0);
  return (
    <form action={action} className="flex flex-1 flex-col gap-[14px]">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-col gap-[6px]">
        <span className="type-ui text-primary">Odometer now</span>
        <BigNumber name="km" label="Odometer now, in km" value={km} onChange={setKm} suffix="km" size="h4" error={bad} />
      </div>
      {value > 0 &&
        (bad ? (
          <CheckLine tone="error">{`Lower than the start of this trip, ${num(startKm)} km. Check the meter again.`}</CheckLine>
        ) : (
          <CheckLine>{`${num(run)} km for this trip`}</CheckLine>
        ))}
      <UploadBox
        label="Meter photo"
        hint="Needed for the Trip log"
        done={hasPhoto}
        doneHint={value ? `${num(value)} km` : "Added"}
        name="photo"
        camera={{ title: "Meter photo", guide: "Fit the meter inside the box so the km can be read." }}
        onPhoto={setPhoto}
      />
      <div className="flex items-center justify-between">
        <span className="type-ui text-primary">Expenses on this trip</span>
        <ExpenseButton id={id} variant="link" />
      </div>
      {expenses.length > 0 && (
        <div className="flex flex-col overflow-hidden rounded-md border border-gray-200 bg-layer">
          {expenses.map((x, i) => (
            <div key={i} className={`flex items-center gap-[12px] px-[14px] py-[12px] ${i ? "border-t border-gray-100" : ""}`}>
              <span className="grid size-[36px] shrink-0 place-items-center rounded-sm bg-gray-50 text-primary">
                <Icon name="receipt" size={18} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="type-ui text-primary">{x.title}</span>
                <span className="flex items-center gap-[4px] type-body-sm text-secondary">
                  <Icon name="check-circle" size={14} className="text-brand" />
                  {x.detail}
                </span>
              </span>
              <span className="type-ui text-primary">{inr(x.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between bg-gray-50 px-[14px] py-[10px]">
            <span className="type-body-sm text-secondary">Paid by you, added to the bill</span>
            <span className="type-ui text-primary">{inr(total)}</span>
          </div>
        </div>
      )}
      <Err state={state} />
      <Spacer />
      <button type="submit" disabled={pending || !value || bad || !photo} className={btnClass("primary")}>
        {editing ? "Save" : "Next: collect payment"}
      </button>
    </form>
  );
}

/* --------------------------------- payment --------------------------------- */

function Qr({ text }: { text: string }) {
  const rows = useMemo(() => qrMatrix(text), [text]);
  const n = rows.length + 8; // 4-module quiet zone
  const path = rows.map((r, y) => r.map((on, x) => (on ? `M${x + 4} ${y + 4}h1v1h-1z` : "")).join("")).join("");
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={150} height={150} role="img" aria-label="UPI payment QR code" shapeRendering="crispEdges" className="bg-white text-black">
      <path d={path} fill="currentColor" />
    </svg>
  );
}

// 10.33 Collect payment · 10.34 Not paid yet · 10.35 Cash received
export function PaymentForm({
  id,
  due,
  breakdown,
  customer,
  upi,
  payee,
  note,
}: {
  id: string;
  due: number;
  breakdown: string;
  customer: string;
  upi?: string;
  payee: string;
  note: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(collectPayment, undefined);
  const [method, setMethod] = useState<"upi" | "cash" | "office">(upi ? "upi" : "cash");
  const [cash, setCash] = useState(num(due));
  const [shownAt] = useState(() => Date.now());
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (method !== "upi") return;
    const t = setTimeout(() => setLate(true), Math.max(0, shownAt + 5 * 60000 - Date.now()));
    return () => clearTimeout(t);
  }, [method, shownAt]);
  const got = toNumber(cash);

  return (
    <form action={action} className="flex flex-1 flex-col gap-[14px]">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="method" value={method} />
      <div className="flex flex-col gap-[4px] rounded-md border border-gray-200 bg-layer p-[16px]">
        <span className="type-body-sm text-secondary">Collect from {customer}</span>
        <span className="type-h2 text-primary">{inr(due)}</span>
        <span className="type-body-sm text-secondary">{breakdown}</span>
      </div>
      <div className="flex flex-col gap-[8px]" role="radiogroup" aria-label="How the customer pays">
        {upi && <RadioRow name="m" value="upi" label="UPI" description="Customer scans the code below" checked={method === "upi"} onChange={() => setMethod("upi")} />}
        <RadioRow name="m" value="cash" label="Cash" description="Keep it and hand it to the office" checked={method === "cash"} onChange={() => setMethod("cash")} />
        <RadioRow name="m" value="office" label="Pay the office later" description="Office collects it from the customer" checked={method === "office"} onChange={() => setMethod("office")} />
      </div>

      {method === "upi" && upi && (
        <div className="flex flex-col items-center gap-[10px] overflow-hidden rounded-md border border-gray-200 bg-layer pt-[16px]">
          <Qr text={upiLink(upi, payee, due, note)} />
          <span className="type-mono-sm text-secondary">{upi}</span>
          <div className={`flex w-full items-center gap-[10px] rounded-md px-[14px] py-[10px] ${late ? "bg-tag-amber" : "bg-gray-50"}`}>
            <span className={`size-[10px] shrink-0 rounded-full ${late ? "bg-inverse" : "animate-pulse bg-warning-500"}`} />
            <span className={`flex-1 type-body-sm ${late ? "text-primary" : "text-secondary"}`}>
              {late
                ? `Not paid after 5 min. Ask ${customer} to check his UPI app, or pick Cash.`
                : `Waiting for ${inr(due)}. Check the payment done screen on the customer’s phone.`}
            </span>
          </div>
        </div>
      )}

      {method === "cash" && (
        <>
          <div className="flex flex-col gap-[6px]">
            <span className="type-ui text-primary">Cash you got</span>
            <BigNumber name="cash" label="Cash you got, in rupees" value={cash} onChange={setCash} prefix="₹" size="h4" />
            {got === due ? (
              <CheckLine>Matches the amount to collect</CheckLine>
            ) : got ? (
              <CheckLine tone="error">{got < due ? `${inr(due - got)} less than the amount to collect` : `${inr(got - due)} more than the amount to collect`}</CheckLine>
            ) : null}
          </div>
          <Notice title={`Cash in hand: ${inr(got)}`}>Hand it to the office by 9 PM today. It shows on your Earnings until then.</Notice>
        </>
      )}

      {method === "office" && <CheckLine>The office collects it from {customer}. Nothing to take now.</CheckLine>}

      <Err state={state} />
      <Spacer />
      <button type="submit" disabled={pending || (method === "cash" && !got)} className={btnClass("primary")}>
        {method === "upi" ? "Customer has paid" : method === "cash" ? "Confirm cash received" : "Next: check and send"}
      </button>
    </form>
  );
}

/* ---------------------------------- send ---------------------------------- */

const QUEUE = "dc-driver-outbox";

type Outbox = { id: string; note: string }[];

function readQueue(): Outbox {
  try {
    return JSON.parse(localStorage.getItem(QUEUE) || "[]") as Outbox;
  } catch {
    return [];
  }
}
function writeQueue(q: Outbox) {
  try {
    localStorage.setItem(QUEUE, JSON.stringify(q));
  } catch {
    // storage blocked: nothing to keep
  }
}

// Sends trips saved while offline as soon as the phone is back online (10.38).
export function OutboxSync() {
  const router = useRouter();
  useEffect(() => {
    const flush = async () => {
      const q = readQueue();
      if (!q.length || !navigator.onLine) return;
      const left: Outbox = [];
      for (const item of q) {
        try {
          const res = await sendToOffice(item.id, item.note);
          if (res?.error && res.error !== "Trip not found.") left.push(item);
        } catch {
          left.push(item);
        }
      }
      writeQueue(left);
      if (left.length < q.length) router.refresh();
    };
    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [router]);
  return null;
}

// 10.36 Check and send (the note + button), and 10.38 when offline.
export function SendForm({ id, offlineDone }: { id: string; offlineDone: React.ReactNode }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [pending, start] = useTransition();

  function send() {
    setError(null);
    if (!navigator.onLine) {
      writeQueue([...readQueue().filter((q) => q.id !== id), { id, note }]);
      setQueued(true);
      return;
    }
    start(async () => {
      try {
        const res = await sendToOffice(id, note);
        if (res?.error) setError(res.error);
        else router.push(`/driver/trip/${id}?step=done`);
      } catch {
        writeQueue([...readQueue().filter((q) => q.id !== id), { id, note }]);
        setQueued(true);
      }
    });
  }

  useEffect(() => {
    if (!queued) return;
    const back = () => {
      if (!readQueue().some((q) => q.id === id)) router.push(`/driver/trip/${id}?step=done`);
    };
    const t = setInterval(back, 3000);
    return () => clearInterval(t);
  }, [queued, id, router]);

  if (queued) return <>{offlineDone}</>;

  return (
    <div className="flex flex-1 flex-col gap-[14px]">
      <div className="flex w-full flex-col gap-[6px]">
        <label htmlFor="office-note" className="type-ui text-primary">
          Note for the office
        </label>
        <div className="rounded-md border border-gray-200 bg-layer px-[14px] py-[10px] focus-within:border-brand">
          <input
            id="office-note"
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional, e.g. customer asked for a stop"
            className="w-full bg-transparent type-body-sm text-primary outline-none placeholder:text-helper"
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="type-body-sm text-negative">
          {error}
        </p>
      )}
      <Spacer />
      <p className="text-center type-body-sm text-secondary">You can change it until the office checks it.</p>
      <button type="button" onClick={send} disabled={pending} className={btnClass("primary")}>
        {pending ? "Sending…" : "Send to office"}
      </button>
    </div>
  );
}

/* ----------------------------------- fix ----------------------------------- */

// 10.39 Office asked to fix — only the flagged item.
export function FixForm({ id, target, label, hint, needsPhoto, footnote }: { id: string; target: string; label: string; hint: string; needsPhoto: boolean; footnote?: React.ReactNode }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(resendFixed, undefined);
  const [photo, setPhoto] = useState(false);
  return (
    <form action={action} className="flex flex-1 flex-col gap-[14px]">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="target" value={target} />
      {needsPhoto ? (
        <UploadBox label={label} hint={hint} name="photo" camera={{ title: label, guide: "Hold still in good light so every number can be read." }} onPhoto={setPhoto} />
      ) : (
        <div className="flex w-full flex-col gap-[6px]">
          <label htmlFor="fix-note" className="type-ui text-primary">
            Note for the office
          </label>
          <textarea id="fix-note" name="note" rows={3} maxLength={300} className="rounded-md border border-gray-200 bg-layer px-[14px] py-[10px] type-body-sm text-primary outline-none focus:border-brand" />
        </div>
      )}
      {footnote}
      <Err state={state} />
      <Spacer />
      <button type="submit" disabled={pending || (needsPhoto && !photo)} className={btnClass("primary")}>
        {pending ? "Sending…" : "Send again"}
      </button>
    </form>
  );
}
