"use client";

import { useState, useTransition } from "react";
import Drawer from "@/components/admin/Drawer";
import Icon from "@/components/admin/Icon";
import { FormError, btnGhost, btnPrimary, inputCls, labelCls } from "@/components/admin/ui";
import { reviewDoc } from "@/app/admin/vendor-actions";
import { vendorMessages, vendorReuploadReasons } from "@/lib/site";
import { docBadge, type Vendor } from "@/lib/vendorTypes";
import { DocTag } from "./parts";
import { dayTime, docPhrase, docUrl, firstName, maskAadhaar, type DocItem, vendorWa } from "./format";

// Figma 6.6 Document review: the file, a "match with the profile" checklist,
// a staff note, then Mark verified or Ask to re-upload (6.17).

type Check = { id: string; label: string; value: string; hint: [string, string]; field?: "number" | "validTill" };

function checksFor(item: DocItem, v: Vendor): Check[] {
  const addr = [v.address?.line, v.address?.town].filter(Boolean).join(", ") || "No address on the profile";
  const name: Check = { id: "name", label: "Name", value: v.name, hint: ["Compare with the profile", "Same as the profile"] };
  const photo: Check = { id: "photo", label: "Photo", value: "Clear, face visible", hint: ["Compare with the profile photo", "Matches the profile photo"] };
  const car = item.car ? `${item.car.model} · ${item.car.number}` : "";
  switch (item.ref.kind) {
    case "aadhaar":
      return [
        name,
        { id: "number", label: "Aadhaar number", value: "", hint: ["Only the last 4 digits are kept", "Only the last 4 digits are kept"], field: "number" },
        { id: "address", label: "Address", value: addr, hint: ["Compare with the location", "Same district as the location"] },
        photo,
      ];
    case "licence":
      return [name, { id: "number", label: "Licence number", value: "", hint: ["As printed on the licence", "As printed on the licence"], field: "number" }, { id: "valid", label: "Valid till", value: "", hint: ["Must not have expired", "In date"], field: "validTill" }, photo];
    case "pan":
      return [name, { id: "number", label: "PAN", value: "", hint: ["10 letters and digits", "10 letters and digits"], field: "number" }];
    case "photo":
      return [photo];
    case "rc":
      return [
        { id: "owner", label: "Owner", value: v.name, hint: ["Compare with the profile", "Same as the profile"] },
        { id: "car", label: "Car", value: car, hint: ["Model and number on the RC", "Same as the car"] },
        { id: "number", label: "RC number", value: "", hint: ["As printed on the RC", "As printed on the RC"], field: "number" },
      ];
    default:
      return [
        { id: "car", label: "Car number", value: item.car?.number ?? "", hint: ["Compare with the car", "Same as the car"] },
        { id: "valid", label: "Valid till", value: "", hint: ["Must not have expired", "In date"], field: "validTill" },
      ];
  }
}

export default function DocReviewDrawer({
  vendor,
  item,
  queue,
  today,
  onClose,
  onOpen,
  onDone,
}: {
  vendor: Vendor;
  item: DocItem;
  queue: DocItem[]; // documents still waiting for review, in page order
  today: string;
  onClose: () => void;
  onOpen: (item: DocItem) => void;
  onDone: (text: string) => void;
}) {
  const d = item.doc;
  const [side, setSide] = useState<"front" | "back">("front");
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState(d.staffNote ?? "");
  const [number, setNumber] = useState(d.number ?? "");
  const [validTill, setValidTill] = useState(d.validTill ?? "");
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState(vendorReuploadReasons[0]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const file = side === "back" && d.fileBack ? d.fileBack : d.file;
  const isPdf = file?.endsWith(".pdf");
  const checks = checksFor(item, vendor);
  const sameRef = (x: DocItem) => x.ref.kind === item.ref.kind && x.ref.carId === item.ref.carId;
  const pos = queue.findIndex(sameRef);
  const rest = queue.filter((x) => !sameRef(x));
  const next = rest[0];
  const label = docPhrase(item, true);

  const subtitle = [vendor.name, d.uploadedAt ? `uploaded ${dayTime(d.uploadedAt)}` : "", d.fileBack ? "2 pages" : ""].filter(Boolean).join(" · ");

  function save(action: "verify" | "reupload" | "save") {
    setError("");
    if (action === "reupload") {
      window.open(vendorWa(vendor.mobile, vendorMessages.reupload(firstName(vendor.name), docPhrase(item), reason)), "_blank", "noopener,noreferrer");
    }
    start(async () => {
      const res = await reviewDoc(vendor.id, item.ref, { action, reason, note, number, validTill });
      if (res.error) return setError(res.error);
      if (action === "verify") {
        onDone(`${label} verified`);
        if (next) onOpen(next);
        else onClose();
      } else if (action === "reupload") {
        onDone(`Asked ${firstName(vendor.name)} to re-upload ${docPhrase(item)} on WhatsApp`);
        onClose();
      } else {
        onDone(`${label} saved`);
        onClose();
      }
    });
  }

  const verified = d.status === "verified";

  return (
    <Drawer
      title={item.car ? `${item.label}` : item.label}
      badge={<DocTag badge={docBadge(d, today)} />}
      subtitle={item.car ? `${item.car.model} · ${item.car.number} · ${subtitle}` : subtitle}
      onClose={onClose}
      footer={
        asking ? (
          <div className="flex w-full flex-col gap-3">
            <div>
              <label htmlFor="reupload-reason" className={labelCls}>
                What’s wrong with it?
              </label>
              <select id="reupload-reason" value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
                {vendorReuploadReasons.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap justify-end gap-2.5">
              <button type="button" className={btnGhost} onClick={() => setAsking(false)}>
                Back
              </button>
              <button type="button" className={btnPrimary} disabled={pending} onClick={() => save("reupload")}>
                <Icon name="whatsapp-logo" size={16} />
                Ask on WhatsApp
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mr-auto min-w-0">
              <p className="type-ui text-primary">{pos >= 0 ? `${pos + 1} of ${queue.length} to check` : verified ? "Verified" : "Not in the review queue"}</p>
              <p className="type-body-sm text-secondary">Asking again sends them a WhatsApp</p>
            </div>
            <button type="button" className={btnGhost} onClick={() => setAsking(true)} disabled={pending}>
              Ask to re-upload
            </button>
            {verified ? (
              <button type="button" className={btnPrimary} onClick={() => save("save")} disabled={pending}>
                Save
              </button>
            ) : (
              <button type="button" className={btnPrimary} onClick={() => save("verify")} disabled={pending || !d.file}>
                <Icon name="check" size={16} />
                Mark verified
              </button>
            )}
          </>
        )
      }
    >
      <div className="flex flex-col gap-4 px-5 py-5.5 md:px-7">
        {d.fileBack && (
          <div role="tablist" className="flex w-fit gap-1 rounded-full bg-gray-50 p-1">
            {(["front", "back"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={side === s}
                onClick={() => setSide(s)}
                className={`rounded-full px-3.5 py-1.5 type-ui capitalize transition-colors ${side === s ? "bg-layer text-primary shadow-[0_1px_2px_var(--shadow-sm)]" : "text-secondary hover:text-primary"}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="relative grid min-h-56 place-items-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50 p-4">
          {!file ? (
            <p className="type-body-sm text-secondary">No file uploaded yet.</p>
          ) : isPdf ? (
            <iframe src={docUrl(file)} title={item.label} className="h-80 w-full rounded-md bg-layer" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- private, auth-checked file
            <img src={docUrl(file)} alt={`${item.label} of ${vendor.name}`} className="max-h-80 w-auto max-w-full rounded-md object-contain" />
          )}
          {file && (
            <a href={docUrl(file)} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 rounded-full border border-gray-100 bg-layer px-2.5 py-1 type-body-sm text-secondary hover:text-primary">
              {isPdf ? "Open full size" : "Tap to zoom"}
            </a>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-100">
          <p className="px-3 py-3 type-ui text-primary">Match with the profile</p>
          {checks.map((c) => {
            const ok = !!ticks[c.id];
            const value =
              c.field === "number" ? (
                <input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  aria-label={c.label}
                  placeholder={item.ref.kind === "aadhaar" ? "Last 4 digits are enough" : "Type it from the document"}
                  className="w-full rounded-sm border border-gray-200 bg-layer px-2 py-1 type-ui text-primary placeholder:text-placeholder focus:border-focus focus:outline-none"
                />
              ) : c.field === "validTill" ? (
                <input
                  type="date"
                  value={validTill}
                  onChange={(e) => setValidTill(e.target.value)}
                  aria-label={c.label}
                  className="w-full rounded-sm border border-gray-200 bg-layer px-2 py-1 type-ui text-primary focus:border-focus focus:outline-none"
                />
              ) : (
                <p className="type-ui text-primary">{c.value}</p>
              );
            return (
              <div key={c.id} className="grid grid-cols-[minmax(0,108px)_minmax(0,1fr)_24px] items-center gap-3 border-t border-gray-100 px-3 py-2.5">
                <p className="type-body-sm text-secondary">{c.label}</p>
                <div className="min-w-0">
                  {value}
                  <p className="type-body-sm text-secondary">{c.field === "number" && item.ref.kind === "aadhaar" && number ? maskAadhaar(number) || c.hint[0] : c.hint[ok ? 1 : 0]}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTicks({ ...ticks, [c.id]: !ok })}
                  aria-pressed={ok}
                  aria-label={ok ? `${c.label} matches` : `Mark ${c.label.toLowerCase()} as matching`}
                  className={`grid size-6 place-items-center rounded-full ${ok ? "text-brand" : "text-tag-amber"} hover:bg-layer-hover`}
                >
                  <Icon name={ok ? "check-circle-14" : "warning-circle-14"} size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {next && (
          <button type="button" onClick={() => onOpen(next)} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 text-left hover:bg-layer-hover">
            <Icon name="file-text-16" size={16} className="text-[var(--icon-secondary)]" />
            <span className="min-w-0 flex-1">
              <span className="block type-ui text-primary">Next: {docPhrase(next, true)}</span>
              <span className="block type-body-sm text-secondary">
                {rest.length} more document{rest.length > 1 ? "s" : ""} to check for this vendor
              </span>
            </span>
            <Icon name="arrow-right" size={16} className="text-brand" />
          </button>
        )}

        <div>
          <label htmlFor="doc-note" className={labelCls}>
            Note for the team (only staff see this)
          </label>
          <textarea id="doc-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={`${inputCls} resize-y`} />
        </div>
        <FormError error={error} />
      </div>
    </Drawer>
  );
}
