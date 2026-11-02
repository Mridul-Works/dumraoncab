"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { approveDriverEntry, askDriverToFix } from "@/app/admin/journal-actions";
import Drawer from "@/components/admin/Drawer";
import Icon from "@/components/admin/Icon";
import { dayLabel, istTime12 } from "@/components/admin/JournalFormat";
import { FormError, btnGhost, btnPrimary } from "@/components/admin/ui";
import { inr } from "@/lib/catalogTypes";
import { expensesTotal, meterKm, type FixReason, type JournalRecord } from "@/lib/journalTypes";

// "Check trip" slide-over for an entry a driver sent from the driver app
// (Figma 4B.5 Check driver entry, 4B.6 Ask to fix). The office checks the
// meter, receipts and payment, sets the money for the Trip log and approves —
// or sends it back with a note.

const num = (s: string) => Number(s.replace(/[,\s₹]/g, "")) || 0;
const digits = (s: string) => s.replace(/\D/g, "");
const grouped = (s: string) => (s === "" ? "" : Number(s).toLocaleString("en-IN"));
const reading = (n: number) => n.toLocaleString("en-IN");
const fmtPhone = (p: string) => (p.length === 10 ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : p);
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "D";

// Meter distance vs the route: within 15% (or 10 km) counts as a match.
const matchesRoute = (meter: number, route: number) => Math.abs(meter - route) <= Math.max(10, route * 0.15);

type Choice = { key: string; reason: FixReason; label: string; hint: string; message: string; expense?: number };

function Radio({ on }: { on: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element -- static two-colour design asset
  if (on) return <img src="/admin-icons/radio-checked.svg" alt="" width={20} height={20} className="size-5 shrink-0" />;
  return <span aria-hidden="true" className="size-5 shrink-0 rounded-full border-[1.5px] border-gray-200 bg-layer" />;
}

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`flex items-center gap-1 type-body-sm ${ok ? "text-brand" : "text-tag-amber"}`}>
      <Icon name={ok ? "check-circle" : "warning-circle"} size={16} />
      {children}
    </span>
  );
}

function MeterPhoto({ file, at, label }: { file?: string; at?: string; label: string }) {
  const caption = at ? `Photo at ${istTime12(at)}` : "No photo";
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      {file ? (
        <a href={`/uploads/${file}`} target="_blank" rel="noreferrer" className="relative block h-24 overflow-hidden rounded-md bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element -- driver upload served by /uploads */}
          <img src={`/uploads/${file}`} alt={`${label} meter photo`} className="size-full object-cover" />
          <span className="absolute inset-x-0 bottom-0 bg-scrim px-2 py-1 type-body-sm text-on-color">{caption}</span>
        </a>
      ) : (
        <div className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-md bg-gray-100">
          <Icon name="gauge" size={24} className="text-[var(--icon-secondary)]" />
          <p className="type-body-sm text-secondary">{caption}</p>
        </div>
      )}
    </div>
  );
}

export default function CheckEntryPanel({
  entry,
  driverName,
  car,
  bookingRef,
  returnTo,
}: {
  entry: JournalRecord;
  driverName: string;
  car: { name: string; number: string } | undefined;
  bookingRef?: string;
  returnTo: string;
}) {
  const router = useRouter();
  const close = () => router.push(returnTo, { scroll: false });
  const [approveState, approve, approving] = useActionState(approveDriverEntry, undefined);
  const [fixState, sendFix, sending] = useActionState(askDriverToFix, undefined);
  const [mode, setMode] = useState<"check" | "fix">("check");
  const first = driverName.split(/\s+/)[0] || "the driver";

  // Money for the Trip log (editable before approving)
  const [money, setMoney] = useState({ fare: String(entry.fare), fuel: String(entry.fuel), driverCut: String(entry.driverCut) });
  const net = num(money.fare) - num(money.fuel) - num(money.driverCut);
  const km = entry.km ?? meterKm(entry) ?? 0;

  // What to fix (4B.6): one choice per receipt, the meter photos, or anything else.
  const expenses = entry.expenses ?? [];
  const choices: Choice[] = [
    ...expenses.map((x, i) => ({
      key: `receipt-${i}`,
      reason: "receipt" as const,
      label: `${x.kind} receipt`,
      hint: "Photo is blurry, amount not readable",
      message: `The ${x.kind.toLowerCase()} receipt is blurry. Please add a clear photo.`,
      expense: i,
    })),
    {
      key: "meter",
      reason: "meter",
      label: "Meter photos",
      hint: "Reading not clear or missing",
      message: "The meter photos are not clear. Please add clear photos of the start and end reading.",
    },
    { key: "other", reason: "other", label: "Something else", hint: "Explain in the message", message: "" },
  ];
  const [choiceKey, setChoiceKey] = useState(choices[0].key);
  const choice = choices.find((c) => c.key === choiceKey) ?? choices[0];
  const [message, setMessage] = useState(choices[0].message);
  const pick = (c: Choice) => {
    // Keep a message the office typed; swap only our own suggestion.
    if (choices.some((x) => x.message === message)) setMessage(c.message);
    setChoiceKey(c.key);
  };

  const meter = meterKm(entry);
  const route = [entry.from, entry.to].filter(Boolean).join(" to ");
  const tripLine = `${route}${entry.to ? ` · ${entry.roundTrip ? "round trip" : "one way"}` : ""}`;
  const who = [entry.customer, entry.phone ? fmtPhone(entry.phone) : "", entry.startedAt && entry.endedAt ? `${istTime12(entry.startedAt)} to ${istTime12(entry.endedAt)}` : ""]
    .filter(Boolean)
    .join(" · ");
  const pay = entry.payment;
  const payLine = pay
    ? pay.method === "upi"
      ? `UPI · ${inr(pay.amount)}${pay.to ? ` to ${pay.to}` : ""}${pay.at ? ` at ${istTime12(pay.at)}` : ""}`
      : `Cash · ${inr(pay.amount)} collected by ${first}${pay.at ? ` at ${istTime12(pay.at)}` : ""}`
    : "Not recorded";

  const fixing = mode === "fix";

  return (
    <Drawer
      title={`Check trip${bookingRef ? ` ${bookingRef}` : ""}`}
      badge={<span className="rounded-full bg-tag-green px-2.5 py-[3px] type-body-sm text-brand">From driver app</span>}
      onClose={close}
      width="max-w-[520px]"
      footer={
        fixing ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="type-body-sm text-secondary">Sent to his phone</p>
              <p className="type-ui text-primary">Entry stays on hold</p>
            </div>
            <button type="button" onClick={() => setMode("check")} className={btnGhost}>
              Cancel
            </button>
            <button type="submit" form="fix-form" disabled={sending || !message.trim()} className={btnPrimary}>
              <Icon name="check" size={16} />
              {sending ? "Sending…" : `Send to ${first}`}
            </button>
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="type-body-sm text-secondary">Net for this trip</p>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className={`type-h3 tabular-nums ${net < 0 ? "text-error" : "text-brand"}`}>{net < 0 ? `−${inr(-net)}` : inr(net)}</span>
                {km > 0 && num(money.fare) > 0 && <span className="type-body-sm text-secondary">fare ₹{(num(money.fare) / km).toFixed(1)} per km</span>}
              </p>
            </div>
            <button type="button" onClick={() => setMode("fix")} className={btnGhost}>
              Ask to fix
            </button>
            <button type="submit" form="approve-form" disabled={approving || money.fare.trim() === ""} className={btnPrimary}>
              <Icon name="check" size={16} />
              {approving ? "Saving…" : entry.status === "approved" ? "Save changes" : "Approve"}
            </button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-[22px] px-5 py-6 md:px-7">
        {/* Driver */}
        <div className="flex items-center gap-3 rounded-md bg-gray-50 px-3.5 py-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand type-ui text-on-color">{initials(driverName)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate type-ui text-primary">{driverName}</p>
            <p className="truncate type-body-sm text-secondary">{[car?.name ?? "Car not found", car?.number, dayLabel(entry.date)].filter(Boolean).join(" · ")}</p>
          </div>
          {entry.submittedAt && <p className="shrink-0 type-body-sm text-secondary">Sent {istTime12(entry.submittedAt)}</p>}
        </div>

        {entry.status === "fix" && entry.fixNote && (
          <p className="flex items-start gap-2 rounded-md bg-tag-amber px-3.5 py-2.5 type-body-sm text-tag-amber">
            <Icon name="warning-circle" size={16} className="mt-0.5" />
            Sent back to {first}: “{entry.fixNote}”
          </p>
        )}

        {/* Trip */}
        <section className="flex flex-col gap-2.5">
          <p className="type-ui text-primary">Trip</p>
          <div className="flex flex-col gap-0.5">
            <p className="type-ui text-primary">{tripLine || "No route given"}</p>
            {who && <p className="type-body-sm text-secondary">{who}</p>}
            {entry.note && <p className="type-body-sm text-secondary">{entry.note}</p>}
          </div>
        </section>

        {/* Meter */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="type-ui text-primary">Meter</p>
            {meter == null ? (
              <Status ok={false}>{entry.odoStart == null ? "Start reading missing" : "End reading missing"}</Status>
            ) : entry.routeKm ? (
              matchesRoute(meter, entry.routeKm) ? (
                <Status ok>{reading(meter)} km, matches the route</Status>
              ) : (
                <Status ok={false}>
                  {reading(meter)} km, route is {reading(entry.routeKm)} km
                </Status>
              )
            ) : (
              <span className="type-body-sm text-secondary">{reading(meter)} km</span>
            )}
          </div>
          <div className="flex gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <MeterPhoto file={entry.odoStartPhoto} at={entry.startedAt} label="Start" />
              <p className="type-ui text-primary">Start · {entry.odoStart != null ? `${reading(entry.odoStart)} km` : "missing"}</p>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <MeterPhoto file={entry.odoEndPhoto} at={entry.endedAt} label="End" />
              <p className="type-ui text-primary">End · {entry.odoEnd != null ? `${reading(entry.odoEnd)} km` : "missing"}</p>
            </div>
          </div>
        </section>

        {/* Expenses */}
        {expenses.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2 type-ui text-primary">
              <p>Expenses, added to the bill</p>
              <p>{inr(expensesTotal(entry))}</p>
            </div>
            <ul className="overflow-hidden rounded-md border border-gray-200 bg-layer">
              {expenses.map((x, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-3 px-3.5 py-2.5 ${i > 0 ? "border-t border-gray-100" : ""} ${fixing && choice.expense === i ? "bg-tag-amber" : ""}`}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-gray-100 text-[var(--icon-secondary)]">
                    <Icon name="receipt" size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate type-ui text-primary">{[x.kind, x.place].filter(Boolean).join(" · ")}</span>
                    <span className="block truncate type-body-sm text-secondary">{x.receipt ? `Receipt${x.at ? ` · ${istTime12(x.at)}` : ""}` : "No receipt"}</span>
                  </span>
                  <span className="shrink-0 type-ui text-primary">{inr(x.amount)}</span>
                  {x.receipt && (
                    <a href={`/uploads/${x.receipt}`} target="_blank" rel="noreferrer" className="shrink-0 type-ui text-link hover:text-link-hover">
                      View
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Payment */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="type-ui text-primary">Payment</p>
            {pay && <Status ok={pay.received}>{pay.received ? "Received" : "Pending"}</Status>}
          </div>
          <p className="type-ui text-primary">{payLine}</p>
        </section>

        {fixing ? (
          <form id="fix-form" action={sendFix} className="flex flex-col gap-[22px]">
            <input type="hidden" name="id" value={entry.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="reason" value={choice.reason} />
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2.5 type-ui text-primary">What should {first} fix?</legend>
              {choices.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={c.key === choiceKey}
                  onClick={() => pick(c)}
                  className="flex items-start gap-2.5 text-left"
                >
                  <Radio on={c.key === choiceKey} />
                  <span>
                    <span className="block type-ui text-primary">{c.label}</span>
                    <span className="block type-body-sm text-secondary">{c.hint}</span>
                  </span>
                </button>
              ))}
            </fieldset>
            <div className="flex flex-col gap-2.5">
              <label htmlFor="fix-note" className="type-ui text-primary">
                Message to {first}
              </label>
              <textarea
                id="fix-note"
                name="note"
                rows={4}
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`What should ${first} change?`}
                className="w-full resize-none rounded-md border border-gray-200 bg-layer px-3.5 py-3 type-body-sm text-primary placeholder:text-placeholder focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
              />
            </div>
            <FormError error={fixState?.error} />
          </form>
        ) : (
          <form id="approve-form" action={approve} className="flex flex-col gap-2.5">
            <input type="hidden" name="id" value={entry.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <p className="type-ui text-primary">For the Trip log</p>
            <div className="flex gap-3">
              {(
                [
                  ["fare", "Fare"],
                  ["fuel", "Fuel"],
                  ["driverCut", "Driver share"],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <label htmlFor={`ce-${k}`} className="type-body-sm text-secondary">
                    {label}
                  </label>
                  <div className="flex items-center rounded-sm border border-gray-200 bg-gray-50 px-3 py-2.5 focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/20">
                    <span className="type-ui text-primary">₹</span>
                    <input
                      id={`ce-${k}`}
                      name={k}
                      inputMode="numeric"
                      value={grouped(money[k])}
                      onChange={(e) => setMoney((m) => ({ ...m, [k]: digits(e.target.value).slice(0, 7) }))}
                      className="min-w-0 flex-1 bg-transparent type-ui text-primary focus:outline-none"
                      style={{ outline: "none" }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <FormError error={approveState?.error} />
          </form>
        )}
      </div>
    </Drawer>
  );
}
