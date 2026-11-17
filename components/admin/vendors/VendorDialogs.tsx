"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { FormError, btnDanger, btnGhost, btnPrimary, inputCls, labelCls } from "@/components/admin/ui";
import {
  approveVendor,
  reactivateVendor,
  rejectVendor,
  suspendVendor,
  undoVendorChange,
  type StatusResult,
  type VendorConflict,
  type VendorSeen,
} from "@/app/admin/vendor-actions";
import { vendorMessages, vendorRejectReasons, vendorSuspendReasons } from "@/lib/site";
import { CAR_DOCS, VENDOR_STATUS_LABELS, carReady, docBadge, findDoc, type Vendor, type VendorCar } from "@/lib/vendorTypes";
import Modal, { StateModal } from "./Modal";
import type { ArtName } from "./parts";
import { clock, dayMonth, firstName, istToday, joinWords, vendorWa, weekdayDate } from "./format";

// Approve / Reject / Suspend / Reactivate confirmations (Figma 6.13, 6.16,
// 6.18, 6.20) and what follows a failed save: 6.15 "Couldn't approve"
// (network) and 6.22 "Already approved elsewhere" (another staff member acted
// first). Used from the vendor list rows and the vendor page. `onDone` shows
// the toast.

export type Upcoming = { id: string; ref: string; when: string; route: string };
export type Done = (text: string, undo?: () => void) => void;

const undo = (id: string) => () => void undoVendorChange(id);
const seenOf = (v: Vendor): VendorSeen => ({ status: v.status, statusAt: v.statusAt });

// The WhatsApp tab is opened inside the click (or the browser blocks the
// pop-up) but only pointed at WhatsApp once the change is saved. If the save
// fails or someone else acted first it closes again, so no message goes out.
function waTab(url: string | null) {
  if (!url) return { go() {}, close() {} };
  const w = window.open("", "_blank");
  if (w) w.opener = null;
  return {
    go: () => (w ? w.location.replace(url) : window.open(url, "_blank", "noopener,noreferrer")),
    close: () => w?.close(),
  };
}

type Outcome = { kind: "failed" } | { kind: "conflict"; conflict: VendorConflict };

// Runs a status change; keeps the inline error, the outcome screen and a retry.
function useStatusAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const last = useRef<() => void>(() => {});

  function run<R extends StatusResult>(wa: string | null, call: () => Promise<R>, ok: (res: R) => void) {
    last.current = () => run(wa, call, ok);
    setError("");
    const tab = waTab(wa);
    start(async () => {
      let res: R;
      try {
        res = await call();
      } catch {
        tab.close();
        setOutcome({ kind: "failed" });
        return;
      }
      if (res.conflict) {
        tab.close();
        setOutcome({ kind: "conflict", conflict: res.conflict });
      } else if (res.error) {
        tab.close();
        setOutcome(null);
        setError(res.error);
      } else {
        tab.go();
        ok(res);
      }
    });
  }
  return { pending, error, outcome, run, retry: () => last.current() };
}

type Verb = "approve" | "reject" | "suspend" | "reactivate";

// "staff@dumraoncab.com" -> "Staff". Staff sign in with an email only.
function actorName(by?: string) {
  const n = (by ?? "").split("@")[0].replace(/[._-]+/g, " ").trim();
  return n ? n.replace(/\b\w/g, (c) => c.toUpperCase()) : "Another staff member";
}

// 6.15 — the save never reached the server.
function FailedModal({ vendor, verb, pending, onRetry, onClose }: { vendor: Vendor; verb: Verb; pending: boolean; onRetry: () => void; onClose: () => void }) {
  const first = firstName(vendor.name);
  return (
    <StateModal
      art="something-went-wrong"
      title={`Couldn’t ${verb} ${first}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} onClick={onRetry} disabled={pending}>
            {pending ? "Trying…" : "Try again"}
          </button>
        </>
      }
    >
      Nothing changed. {first} is still {VENDOR_STATUS_LABELS[vendor.status]} and no WhatsApp went out. Check the internet and try again.
    </StateModal>
  );
}

// 6.22 — another staff member changed this vendor first.
function ConflictModal({ vendor, conflict: c, onClose }: { vendor: Vendor; conflict: VendorConflict; onClose: () => void }) {
  const router = useRouter();
  const first = firstName(vendor.name);
  const who = actorName(c.by);
  const did =
    c.status === "approved"
      ? c.was === "suspended"
        ? "reactivated"
        : "approved"
      : c.status === "rejected"
        ? "rejected"
        : c.status === "suspended"
          ? "suspended"
          : "moved back to Pending";
  const art: ArtName = c.status === "approved" ? "vendor-approved" : c.status === "suspended" ? "vendor-paused" : "documents";
  const today = istToday();
  const when = c.at ? (c.at.slice(0, 10) === today ? ` at ${clock(c.at)}` : ` on ${dayMonth(c.at)} at ${clock(c.at)}`) : "";
  const ready = vendor.cars.filter((car) => carReady(car, today)).map((car) => car.model);
  const after =
    c.status === "approved"
      ? ready.length
        ? ` ${joinWords(ready)} can take trips.`
        : ""
      : c.status === "suspended"
        ? c.until
          ? ` Off trips till ${weekdayDate(c.until)}.`
          : " Off trips until reactivated."
        : "";
  const leave = () => {
    onClose();
    router.refresh();
  };
  return (
    <StateModal
      art={art}
      title={`${who} already ${did} ${first}`}
      onClose={leave}
      footer={
        <>
          <button type="button" className={btnGhost} onClick={leave}>
            Close
          </button>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              onClose();
              router.push(`/admin/vendors/${vendor.id}`);
              router.refresh();
            }}
          >
            See vendor
          </button>
        </>
      }
    >
      {`${who} ${did} ${first}${when} from another computer, so nothing changed here.${after}`}
    </StateModal>
  );
}

function Outcomes({ vendor, verb, outcome, pending, retry, onClose }: { vendor: Vendor; verb: Verb; outcome: Outcome; pending: boolean; retry: () => void; onClose: () => void }) {
  return outcome.kind === "failed" ? (
    <FailedModal vendor={vendor} verb={verb} pending={pending} onRetry={retry} onClose={onClose} />
  ) : (
    <ConflictModal vendor={vendor} conflict={outcome.conflict} onClose={onClose} />
  );
}

function Row({ ok, title, children }: { ok: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0">
      <Icon name={ok ? "check-circle" : "warning-circle"} size={18} className={`mt-px ${ok ? "text-brand" : "text-tag-amber"}`} />
      <div className="min-w-0">
        <p className="type-ui text-primary">{title}</p>
        <p className="type-body-sm text-secondary">{children}</p>
      </div>
    </li>
  );
}

const shortDoc: Record<string, string> = { rc: "RC", insurance: "insurance", permit: "permit", puc: "PUC", aadhaar: "Aadhaar", licence: "driving licence", photo: "profile photo" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function ApproveDialog({ vendor, today, onClose, onDone }: { vendor: Vendor; today: string; onClose: () => void; onDone: Done }) {
  const [welcome, setWelcome] = useState(true);
  const { pending, error, outcome, run, retry } = useStatusAction();

  const carRows = vendor.cars.map((car) => {
    const bad = CAR_DOCS.map((k) => ({ k, b: docBadge(findDoc(car.docs, k), today) })).filter((x) => x.b !== "verified" && x.b !== "expiring");
    const missing = bad.filter((x) => x.b === "missing" || x.b === "expired").map((x) => shortDoc[x.k]);
    const review = bad.filter((x) => x.b === "review").map((x) => shortDoc[x.k]);
    const text = !bad.length
      ? `All ${CAR_DOCS.length} documents verified · can take trips`
      : missing.length
        ? `${cap(joinWords(missing))} missing · stays off trips until ${missing.length > 1 ? "they are" : "it is"} uploaded`
        : `${cap(joinWords(review))} ${review.length > 1 ? "need" : "needs"} review · stays off trips until ${review.length > 1 ? "they are" : "it is"} checked`;
    return { car, ok: !bad.length, text };
  });
  const personKinds = ["aadhaar", "licence"] as const;
  const personBad = personKinds.filter((k) => docBadge(findDoc(vendor.docs, k), today) !== "verified" && docBadge(findDoc(vendor.docs, k), today) !== "expiring");
  const personText = personBad.length
    ? `${cap(joinWords(personBad.map((k) => shortDoc[k])))} ${personBad.length > 1 ? "need" : "needs"} review`
    : "Aadhaar and driving licence verified";

  function approve() {
    const seen = seenOf(vendor);
    run(
      welcome ? vendorWa(vendor.mobile, vendorMessages.welcome(firstName(vendor.name))) : null,
      () => approveVendor(vendor.id, seen),
      () => {
        onClose();
        onDone(`${vendor.name} approved${welcome ? " · welcome note sent on WhatsApp" : ""}`, undo(vendor.id));
      },
    );
  }

  if (outcome) return <Outcomes vendor={vendor} verb="approve" outcome={outcome} pending={pending} retry={retry} onClose={onClose} />;
  return (
    <Modal
      icon="check"
      tone="good"
      title={`Approve ${vendor.name}?`}
      subtitle="They can take trips from today. Staff will see them when assigning a driver to a booking."
      onClose={onClose}
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} onClick={approve} disabled={pending}>
            <Icon name="check" size={16} />
            {pending ? "Approving…" : "Approve vendor"}
          </button>
        </>
      }
    >
      <ul className="rounded-lg border border-gray-100">
        {carRows.map(({ car, ok, text }) => (
          <Row key={car.id} ok={ok} title={[car.model, car.number].filter(Boolean).join(" · ")}>
            {text}
          </Row>
        ))}
        <Row ok={!personBad.length} title="Person">
          {personText}
        </Row>
      </ul>
      <button type="button" onClick={() => setWelcome(!welcome)} aria-pressed={welcome} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3.5 text-left">
        <Icon name="whatsapp-logo" size={20} className="shrink-0 text-secondary" />
        <span className="min-w-0 flex-1">
          <span className="block type-ui text-primary">Send a welcome note on WhatsApp</span>
          <span className="block type-body-sm text-secondary">To {vendor.mobile} with the app link and payout day</span>
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={welcome ? "/admin-icons/toggle-on.svg" : "/admin-icons/toggle-off.svg"} alt="" width={36} height={20} className="block h-5 w-9 shrink-0" />
      </button>
      <FormError error={error} />
    </Modal>
  );
}

export function RejectDialog({ vendor, onClose, onDone }: { vendor: Vendor; onClose: () => void; onDone: Done }) {
  const first = firstName(vendor.name);
  const rcNumber = vendor.cars.find((c) => c.number)?.number ?? "";
  const draft = (id: string) => vendorMessages.reject(first, id, rcNumber);
  const [reason, setReason] = useState(vendorRejectReasons[0].id);
  const [message, setMessage] = useState(draft(vendorRejectReasons[0].id));
  const [edited, setEdited] = useState(false);
  const { pending, error, outcome, run, retry } = useStatusAction();

  function pick(id: string) {
    setReason(id);
    if (!edited) setMessage(draft(id));
  }

  function reject() {
    const label = vendorRejectReasons.find((r) => r.id === reason)?.label ?? "";
    const text = message.trim();
    const seen = seenOf(vendor);
    run(
      text ? vendorWa(vendor.mobile, text) : null,
      () => rejectVendor(vendor.id, label, text, seen),
      () => {
        onClose();
        onDone(`${vendor.name} rejected${text ? " · message sent on WhatsApp" : ""}`, undo(vendor.id));
      },
    );
  }

  if (outcome) return <Outcomes vendor={vendor} verb="reject" outcome={outcome} pending={pending} retry={retry} onClose={onClose} />;
  return (
    <Modal
      icon="x"
      tone="bad"
      title={`Reject ${vendor.name}?`}
      subtitle="They get a WhatsApp with your message. They can apply again after 30 days."
      onClose={onClose}
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btnDanger} onClick={reject} disabled={pending}>
            {pending ? "Rejecting…" : "Reject vendor"}
          </button>
        </>
      }
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-5 block type-ui text-primary">Reason</legend>
        {vendorRejectReasons.map((r) => {
          const on = r.id === reason;
          return (
            <label
              key={r.id}
              className={`flex cursor-pointer gap-3 rounded-lg border p-[15px] transition-colors ${on ? "border-brand bg-layer-selected" : "border-gray-100 bg-layer hover:bg-layer-hover"}`}
            >
              <input type="radio" name="reason" value={r.id} checked={on} onChange={() => pick(r.id)} className="sr-only" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={on ? "/admin-icons/radio-on-18.svg" : "/admin-icons/radio-off-18.svg"} alt="" width={18} height={18} className="mt-px size-4.5 shrink-0" />
              <span>
                <span className="block type-ui text-primary">{r.label}</span>
                <span className="block type-body-sm text-secondary">{r.hint}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
      <div>
        <label htmlFor="reject-msg" className={labelCls}>
          Message to the vendor
        </label>
        <textarea
          id="reject-msg"
          rows={3}
          value={message}
          onChange={(e) => {
            setEdited(true);
            setMessage(e.target.value);
          }}
          className={`${inputCls} resize-y`}
        />
      </div>
      <FormError error={error} />
    </Modal>
  );
}

const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

export function SuspendDialog({
  vendor,
  upcoming,
  today,
  onClose,
  onDone,
}: {
  vendor: Vendor;
  upcoming: Upcoming[];
  today: string;
  onClose: () => void;
  onDone: Done;
}) {
  const [reason, setReason] = useState(vendorSuspendReasons[0]);
  const [days, setDays] = useState<7 | 30 | null>(30);
  const [move, setMove] = useState(true);
  const [message, setMessage] = useState("");
  const { pending, error, outcome, run, retry } = useStatusAction();
  const n = vendor.cars.length;
  const subtitle = `${n === 0 ? "They come" : n === 1 ? "Their car comes" : n === 2 ? "Both cars come" : `All ${n} cars come`} off trips right away. You can reactivate them any time.`;

  function suspend() {
    const text = message.trim();
    const seen = seenOf(vendor);
    run(
      text ? vendorWa(vendor.mobile, text) : null,
      () => suspendVendor(vendor.id, { reason, days, message: text, move: move && upcoming.length > 0 }, seen),
      (res) => {
        onClose();
        const moved = res.moved ?? 0;
        onDone(`Vendor suspended${moved ? ` · ${moved} booking${moved > 1 ? "s" : ""} moved to other drivers` : ""}`, undo(vendor.id));
      },
    );
  }

  const ranges: { v: 7 | 30 | null; label: string }[] = [
    { v: 7, label: "7 days" },
    { v: 30, label: "30 days" },
    { v: null, label: "Until I reactivate" },
  ];

  if (outcome) return <Outcomes vendor={vendor} verb="suspend" outcome={outcome} pending={pending} retry={retry} onClose={onClose} />;
  return (
    <Modal
      icon="warning-circle"
      tone="warn"
      width="max-w-[560px]"
      title={`Suspend ${vendor.name}?`}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btnDanger} onClick={suspend} disabled={pending}>
            {pending ? "Suspending…" : days ? `Suspend for ${days} days` : "Suspend"}
          </button>
        </>
      }
    >
      <div>
        <label htmlFor="suspend-reason" className={labelCls}>
          Reason
        </label>
        <select id="suspend-reason" value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} select-caret`}>
          {vendorSuspendReasons.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>
      <div>
        <p className={labelCls}>How long</p>
        <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-full bg-gray-50 p-[5px]">
          {ranges.map((r) => (
            <button
              key={r.label}
              type="button"
              role="radio"
              aria-checked={days === r.v}
              onClick={() => setDays(r.v)}
              className={`rounded-full px-2 py-2 type-body-sm transition-colors ${days === r.v ? "bg-layer text-primary shadow-[0_1px_2px_var(--shadow-sm)]" : "text-secondary hover:text-primary"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="mt-2 type-body-sm text-secondary">
          {days ? `Back on trips on ${weekdayDate(addDays(today, days))} unless you reactivate sooner` : "Stays off trips until you reactivate"}
        </p>
      </div>
      {upcoming.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <p className="flex items-center gap-2.5 px-4 py-3 type-ui text-primary">
            <Icon name="warning-circle" size={18} className="text-tag-amber" />
            {upcoming.length} upcoming booking{upcoming.length > 1 ? "s use" : " uses"} these cars
          </p>
          {upcoming.map((b) => (
            <p key={b.id} className="flex gap-3 border-t border-gray-100 px-4 py-2.5 type-body-sm text-primary">
              <span className="mt-0.5 shrink-0 type-mono-sm text-secondary">{b.ref}</span>
              <span className="min-w-0">
                {b.when} · {b.route}
              </span>
            </p>
          ))}
          <button type="button" onClick={() => setMove(!move)} aria-pressed={move} className="flex w-full items-center gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3 text-left">
            <span className="min-w-0 flex-1">
              <span className="block type-ui text-primary">Move them to other drivers</span>
              <span className="block type-body-sm text-secondary">We pick the nearest approved vendor with the same car type</span>
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={move ? "/admin-icons/toggle-on.svg" : "/admin-icons/toggle-off.svg"} alt="" width={36} height={20} className="block h-5 w-9 shrink-0" />
          </button>
        </div>
      )}
      <div>
        <label htmlFor="suspend-msg" className={labelCls}>
          Message to the vendor (optional)
        </label>
        <textarea
          id="suspend-msg"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={vendorMessages.suspend(firstName(vendor.name), days ? weekdayDate(addDays(today, days)) : "")}
          className={`${inputCls} resize-y`}
        />
      </div>
      <FormError error={error} />
    </Modal>
  );
}

// What keeps a car off trips once the vendor is back, e.g. "stays off until insurance is in".
function offReason(car: VendorCar, today: string) {
  const bad = CAR_DOCS.map((k) => ({ k, b: docBadge(findDoc(car.docs, k), today) })).filter((x) => x.b !== "verified" && x.b !== "expiring");
  const missing = bad.filter((x) => x.b === "missing" || x.b === "expired").map((x) => shortDoc[x.k]);
  const review = bad.filter((x) => x.b === "review").map((x) => shortDoc[x.k]);
  if (missing.length) return `stays off until ${joinWords(missing)} ${missing.length > 1 ? "are" : "is"} in`;
  return `stays off until ${joinWords(review)} ${review.length > 1 ? "are" : "is"} checked`;
}

// 6.20 — Reactivate from the vendor page (6.19) or a list row.
export function ReactivateDialog({ vendor, today, onClose, onDone }: { vendor: Vendor; today: string; onClose: () => void; onDone: Done }) {
  const first = firstName(vendor.name);
  const [tell, setTell] = useState(true);
  const { pending, error, outcome, run, retry } = useStatusAction();
  const since = vendor.statusAt ? `Suspended since ${dayMonth(vendor.statusAt)}. ` : "";
  const n = vendor.cars.length;
  const theirCars = n === 0 ? "them" : n === 1 ? "their car" : "their cars";
  const subtitle = `${since}Reactivating puts ${theirCars} back on trips now${vendor.suspendedUntil ? `, not on ${weekdayDate(vendor.suspendedUntil)}` : ""}.`;

  function reactivate() {
    const seen = seenOf(vendor);
    run(
      tell ? vendorWa(vendor.mobile, vendorMessages.reactivate(first)) : null,
      () => reactivateVendor(vendor.id, seen),
      () => {
        onClose();
        onDone(`${vendor.name} is back on trips${tell ? " · WhatsApp sent" : ""}`, undo(vendor.id));
      },
    );
  }

  if (outcome) return <Outcomes vendor={vendor} verb="reactivate" outcome={outcome} pending={pending} retry={retry} onClose={onClose} />;
  return (
    <Modal
      icon="check-circle"
      tone="good"
      width="max-w-[560px]"
      title={`Reactivate ${vendor.name}?`}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} onClick={reactivate} disabled={pending}>
            <Icon name="check" size={16} />
            {pending ? "Reactivating…" : "Reactivate vendor"}
          </button>
        </>
      }
    >
      <div className="overflow-hidden rounded-lg border border-gray-100">
        {n > 0 && (
          <>
            <p className="flex items-center gap-2.5 px-4 py-3 type-ui text-primary">
              <Icon name="check-circle" size={18} className="text-brand" />
              {n > 1 ? "Cars going back on trips" : "Car going back on trips"}
            </p>
            {vendor.cars.map((car) => (
              <p key={car.id} className="flex gap-3 border-t border-gray-100 px-4 py-2.5 type-body-sm text-primary">
                <span className="mt-0.5 shrink-0 type-mono-sm text-secondary">{car.number}</span>
                <span className="min-w-0">
                  {car.model} · {carReady(car, today) ? `all ${CAR_DOCS.length} papers valid` : offReason(car, today)}
                </span>
              </p>
            ))}
          </>
        )}
        <button
          type="button"
          onClick={() => setTell(!tell)}
          aria-pressed={tell}
          className={`flex w-full items-center gap-3 bg-gray-50 px-4 py-3 text-left ${n > 0 ? "border-t border-gray-100" : ""}`}
        >
          <span className="min-w-0 flex-1">
            <span className="block type-ui text-primary">Tell {first} on WhatsApp</span>
            <span className="block type-body-sm text-secondary">Sends “You can take trips again” to {vendor.mobile}</span>
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tell ? "/admin-icons/toggle-on.svg" : "/admin-icons/toggle-off.svg"} alt="" width={36} height={20} className="block h-5 w-9 shrink-0" />
        </button>
      </div>
      <FormError error={error} />
    </Modal>
  );
}
