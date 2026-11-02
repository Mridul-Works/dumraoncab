"use client";

import { useState, useTransition } from "react";
import Icon from "@/components/admin/Icon";
import { FormError, btnDanger, btnGhost, btnPrimary, inputCls, labelCls } from "@/components/admin/ui";
import { approveVendor, rejectVendor, suspendVendor, undoVendorChange } from "@/app/admin/vendor-actions";
import { vendorMessages, vendorRejectReasons, vendorSuspendReasons } from "@/lib/site";
import { CAR_DOCS, docBadge, findDoc, type Vendor } from "@/lib/vendorTypes";
import Modal from "./Modal";
import { firstName, joinWords, vendorWa, weekdayDate } from "./format";

// Approve / Reject / Suspend confirmations (Figma 6.7, 6.9, 6.10). Used from
// the vendor list rows and the vendor page. `onDone` shows the toast.

export type Upcoming = { id: string; ref: string; when: string; route: string };
export type Done = (text: string, undo?: () => void) => void;

const undo = (id: string) => () => void undoVendorChange(id);

// Opens WhatsApp in a new tab. Must run inside the click handler or the
// browser blocks the pop-up.
const openWa = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

function Row({ ok, title, children }: { ok: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 border-b border-gray-100 px-3.5 py-3 last:border-b-0">
      <Icon name={ok ? "check-circle-14" : "warning-circle-14"} size={14} className={`mt-[3px] ${ok ? "text-brand" : "text-tag-amber"}`} />
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
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

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
    setError("");
    if (welcome) openWa(vendorWa(vendor.mobile, vendorMessages.welcome(firstName(vendor.name))));
    start(async () => {
      const res = await approveVendor(vendor.id);
      if (res.error) return setError(res.error);
      onClose();
      onDone(`${vendor.name} approved${welcome ? " · welcome note sent on WhatsApp" : ""}`, undo(vendor.id));
    });
  }

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
      <button type="button" onClick={() => setWelcome(!welcome)} aria-pressed={welcome} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3.5 py-3 text-left">
        <Icon name="whatsapp-logo" size={16} className="shrink-0 text-secondary" />
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
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function pick(id: string) {
    setReason(id);
    if (!edited) setMessage(draft(id));
  }

  function reject() {
    setError("");
    const label = vendorRejectReasons.find((r) => r.id === reason)?.label ?? "";
    const text = message.trim();
    if (text) openWa(vendorWa(vendor.mobile, text));
    start(async () => {
      const res = await rejectVendor(vendor.id, label, text);
      if (res.error) return setError(res.error);
      onClose();
      onDone(`${vendor.name} rejected${text ? " · message sent on WhatsApp" : ""}`, undo(vendor.id));
    });
  }

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
        <legend className={labelCls}>Reason</legend>
        {vendorRejectReasons.map((r) => {
          const on = r.id === reason;
          return (
            <label
              key={r.id}
              className={`flex cursor-pointer gap-3 rounded-lg border px-3.5 py-2.5 transition-colors ${on ? "border-brand bg-layer-selected" : "border-gray-100 bg-layer hover:bg-layer-hover"}`}
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
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const n = vendor.cars.length;
  const subtitle = `${n === 0 ? "They come" : n === 1 ? "Their car comes" : n === 2 ? "Both cars come" : `All ${n} cars come`} off trips right away. You can reactivate them any time.`;

  function suspend() {
    setError("");
    const text = message.trim();
    if (text) openWa(vendorWa(vendor.mobile, text));
    start(async () => {
      const res = await suspendVendor(vendor.id, { reason, days, message: text, move: move && upcoming.length > 0 });
      if (res.error) return setError(res.error);
      onClose();
      const moved = res.moved ?? 0;
      onDone(`Vendor suspended${moved ? ` · ${moved} booking${moved > 1 ? "s" : ""} moved to other drivers` : ""}`, undo(vendor.id));
    });
  }

  const ranges: { v: 7 | 30 | null; label: string }[] = [
    { v: 7, label: "7 days" },
    { v: 30, label: "30 days" },
    { v: null, label: "Until I reactivate" },
  ];

  return (
    <Modal
      icon="warning-circle"
      tone="warn"
      width="max-w-[398px]"
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
        <select id="suspend-reason" value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
          {vendorSuspendReasons.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>
      <div>
        <p className={labelCls}>How long</p>
        <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-full bg-gray-50 p-1">
          {ranges.map((r) => (
            <button
              key={r.label}
              type="button"
              role="radio"
              aria-checked={days === r.v}
              onClick={() => setDays(r.v)}
              className={`rounded-full px-2 py-1.5 type-body-sm transition-colors ${days === r.v ? "bg-layer text-primary shadow-[0_1px_2px_var(--shadow-sm)]" : "text-secondary hover:text-primary"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 type-body-sm text-secondary">
          {days ? `Back on trips on ${weekdayDate(addDays(today, days))} unless you reactivate sooner` : "Stays off trips until you reactivate"}
        </p>
      </div>
      {upcoming.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <p className="flex items-center gap-2 px-3.5 py-2.5 type-ui text-primary">
            <Icon name="warning-circle-14" size={14} className="text-tag-amber" />
            {upcoming.length} upcoming booking{upcoming.length > 1 ? "s use" : " uses"} these cars
          </p>
          {upcoming.map((b) => (
            <p key={b.id} className="flex gap-2 border-t border-gray-100 px-3.5 py-2 type-body-sm text-primary">
              <span className="type-mono-sm text-secondary">{b.ref}</span>
              <span className="min-w-0">
                {b.when} · {b.route}
              </span>
            </p>
          ))}
          <button type="button" onClick={() => setMove(!move)} aria-pressed={move} className="flex w-full items-center gap-3 border-t border-gray-100 bg-gray-50 px-3.5 py-2.5 text-left">
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
