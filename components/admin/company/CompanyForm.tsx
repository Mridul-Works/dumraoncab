"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { saveCompanyProfile, uploadCompanyLogo } from "@/app/admin/company-actions";
import { ToggleArt } from "@/components/admin/FleetCard";
import Icon from "@/components/admin/Icon";
import { FormError, btnGhost, btnPrimary, cardCls, inputCls, labelCls } from "@/components/admin/ui";
import type { Company } from "@/lib/company";
import {
  BIHAR_DISTRICTS,
  FIELD_LABELS,
  STATES,
  fieldErrors,
  fromDraft,
  sections,
  showMobile,
  toDraft,
  type CompanyDraft,
  type DraftKey,
} from "./profileFields";

// Company profile (Figma 8.1 profile · 8.2 unsaved changes · 8.3 missing info
// · 8.4 saved). Left: the form in six cards, changed fields get a green edge.
// Right: "Profile complete" checklist and a live "Where this shows" preview.

const savedLine = (at?: string, by?: string) => {
  if (!at) return "Not saved yet · showing the website’s details";
  const day = new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  return `Saved ${day}${by ? ` by ${by}` : ""}`;
};

// "+91 94311 00700 · GSTIN 10ABCDE1234F1Z5"
const pdfContactLine = (d: CompanyDraft) => [showMobile(d.phone), d.showGstin && d.gstin.trim() ? `GSTIN ${d.gstin.trim().toUpperCase()}` : ""].filter(Boolean).join(" · ");

const initials = (d: CompanyDraft) =>
  (d.shortName || d.name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "DC";

export default function CompanyForm({ company, latestBookingId }: { company: Company; latestBookingId?: string }) {
  const [base, setBase] = useState(company);
  const saved = useMemo(() => toDraft(base), [base]);
  const [draft, setDraft] = useState<CompanyDraft>(saved);
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<DraftKey, string>>>({});
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [toast, setToast] = useState(false);
  const [pending, startSave] = useTransition();
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends DraftKey>(key: K, value: CompanyDraft[K]) => {
    // While "WhatsApp is the same as phone" is ticked, the WhatsApp number follows the phone.
    setDraft((d) => ({ ...d, [key]: value, ...(key === "phone" && d.whatsappSame ? { whatsapp: value as string } : {}) }));
    setServerErrors((e) => ({ ...e, [key]: undefined }));
    setJustSaved(false);
  };

  const errors = useMemo(() => ({ ...fieldErrors(draft), ...serverErrors }), [draft, serverErrors]);
  const errorList = (Object.keys(errors) as DraftKey[]).filter((k) => errors[k]);
  const shownError = (k: DraftKey) => (showErrors ? errors[k] : undefined);
  const checks = useMemo(() => sections(draft), [draft]);
  const doneCount = checks.filter((s) => s.done).length;

  // Changed fields, in form order; logo meta and the WhatsApp toggle fold into one label.
  const changed = (k: DraftKey) => draft[k] !== saved[k];
  const changes = useMemo(() => {
    const labels: string[] = [];
    for (const k of Object.keys(draft) as DraftKey[]) {
      if (draft[k] === saved[k]) continue;
      if (k === "whatsapp" && draft.whatsappSame && saved.whatsappSame) continue; // follows the phone
      const label = FIELD_LABELS[k];
      if (!labels.includes(label)) labels.push(label);
    }
    return labels;
  }, [draft, saved]);
  const dirty = changes.length > 0;

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  function discard() {
    setDraft(saved);
    setShowErrors(false);
    setServerErrors({});
    setError("");
  }

  function save() {
    setError("");
    if (errorList.length) {
      setShowErrors(true);
      // Take staff to the first field to fix.
      requestAnimationFrame(() => {
        const el = document.getElementById(`co-${errorList[0]}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus({ preventScroll: true });
      });
      return;
    }
    startSave(async () => {
      const res = await saveCompanyProfile(draft).catch(() => ({ error: "Couldn’t save — check your connection and try again." }) as const);
      if ("errors" in res && res.errors) {
        setServerErrors(res.errors);
        setShowErrors(true);
        return;
      }
      if (!("ok" in res) || !res.ok) {
        setError(("error" in res && res.error) || "Couldn’t save — try again.");
        return;
      }
      setBase({ ...fromDraft(draft, base), updatedAt: res.updatedAt, updatedBy: res.updatedBy });
      setShowErrors(false);
      setJustSaved(true);
      setToast(true);
    });
  }

  function onLogo(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    const fd = new FormData();
    fd.set("logo", file);
    startUpload(async () => {
      const res = await uploadCompanyLogo(fd).catch(() => ({ error: "Upload failed — check the file is under 2 MB." }) as { url?: string; name?: string; kb?: number; error?: string });
      if (res.url) {
        setDraft((d) => ({ ...d, logo: res.url as string, logoName: res.name ?? "", logoKb: res.kb ? String(res.kb) : "" }));
        setJustSaved(false);
      } else setUploadError(res.error ?? "Upload failed.");
      if (fileInput.current) fileInput.current.value = "";
    });
  }

  // Header note: errors (8.3) › unsaved (8.2) › saved (8.1 / 8.4).
  const headerNote =
    showErrors && errorList.length
      ? `${errorList.length} thing${errorList.length === 1 ? "" : "s"} to fix before saving`
      : dirty
        ? `${changes.length} unsaved change${changes.length === 1 ? "" : "s"}`
        : justSaved
          ? "Saved just now"
          : savedLine(base.updatedAt, base.updatedBy);

  const text = (key: DraftKey, label: string, props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "value" | "onChange"> = {}) => (
    <TextField id={`co-${key}`} label={label} value={draft[key] as string} onChange={(v) => set(key, v as never)} changed={changed(key)} error={shownError(key)} {...props} />
  );

  const footerLine = [
    draft.name.trim(),
    [draft.addressLine.trim(), draft.town.trim(), [draft.state.trim(), draft.pin.trim()].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    draft.open24 ? "Open 24 hours" : draft.hours.trim(),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <h1 className="type-h1 text-primary">Company profile</h1>
          <p className="mt-1 type-body-md text-secondary">Shown on booking PDFs, WhatsApp messages and the website footer.</p>
        </div>
        <p className={`type-body-sm ${showErrors && errorList.length ? "text-error" : "text-secondary"}`} role="status">
          {headerNote}
        </p>
        <button type="button" onClick={save} disabled={pending || !dirty} className={btnPrimary}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Form */}
        <div className="flex flex-col gap-5">
          <Card title="Brand" intro="How your business appears to customers.">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                onLogo(e.dataTransfer.files?.[0]);
              }}
              className={`flex items-center gap-3 rounded-md border px-4 py-3 ${
                changed("logo") ? "border-[1.5px] border-brand" : dragging ? "border-focus bg-selected" : "border-gray-100"
              }`}
            >
              <label htmlFor="co-logo-file" className="grid size-10 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-md bg-gray-50 text-[var(--icon-secondary)]">
                {draft.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- uploaded logo, small thumbnail
                  <img src={draft.logo} alt="" className="size-full object-cover" />
                ) : (
                  <Icon name="file-text" size={16} />
                )}
              </label>
              <label htmlFor="co-logo-file" className="min-w-0 flex-1 cursor-pointer">
                <span className="block type-ui text-primary">Logo</span>
                <span className="block truncate type-body-sm text-secondary">
                  {uploading
                    ? "Uploading…"
                    : draft.logo
                      ? [draft.logoName || "logo", draft.logoKb && `${draft.logoKb} KB`, "square, at least 512 px"].filter(Boolean).join(" · ")
                      : "Drop a square PNG or JPG here, at least 512 px — or click to choose"}
                </span>
              </label>
              {draft.logo ? (
                <>
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, logo: "", logoName: "", logoKb: "" }))}
                    className="shrink-0 type-body-sm text-secondary hover:text-primary"
                  >
                    Remove
                  </button>
                  <Icon name="check-circle" size={16} className="text-brand" />
                </>
              ) : (
                <Icon name="upload-simple" size={16} className="text-[var(--icon-secondary)]" />
              )}
              <input
                ref={fileInput}
                id="co-logo-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => onLogo(e.target.files?.[0])}
              />
            </div>
            {uploadError && <p className="-mt-2 type-body-sm text-error">{uploadError}</p>}
            <Row>
              {text("name", "Business name")}
              {text("shortName", "Short name")}
            </Row>
            {text("tagline", "Tagline")}
          </Card>

          <Card title="Contact" intro="Customers call and message this number.">
            <Row>
              {text("phone", "Phone", { inputMode: "tel", autoComplete: "tel" })}
              <TextField
                id="co-whatsapp"
                label="WhatsApp"
                value={draft.whatsappSame ? draft.phone : draft.whatsapp}
                onChange={(v) => set("whatsapp", v)}
                changed={changed("whatsapp") || changed("whatsappSame")}
                error={shownError("whatsapp")}
                disabled={draft.whatsappSame}
                inputMode="tel"
              />
            </Row>
            <label className="flex w-max cursor-pointer items-center gap-2 type-body-sm text-primary">
              <input
                type="checkbox"
                checked={draft.whatsappSame}
                onChange={(e) => {
                  const same = e.target.checked;
                  setDraft((d) => ({ ...d, whatsappSame: same, whatsapp: same ? d.phone : d.whatsapp }));
                }}
                className="peer sr-only"
              />
              <span className="grid size-[18px] shrink-0 place-items-center rounded-sm border border-gray-200 bg-layer text-on-color peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus peer-checked:[&>span]:opacity-100">
                <Icon name="check-12" size={12} className="opacity-0" />
              </span>
              WhatsApp is the same as phone
            </label>
            <Row>
              {text("email", "Email", { type: "email", autoComplete: "email" })}
              {text("website", "Website", { inputMode: "url" })}
            </Row>
          </Card>

          <Card title="Office" intro="Where the cab stand is. Drivers and customers see this pin.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
              {text("addressLine", "Address", { autoComplete: "street-address" })}
              {text("pin", "PIN code", { inputMode: "numeric", maxLength: 6, autoComplete: "postal-code" })}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {text("town", "Town")}
              <SelectField id="co-district" label="District" value={draft.district} options={BIHAR_DISTRICTS} onChange={(v) => set("district", v)} changed={changed("district")} />
              <SelectField id="co-state" label="State" value={draft.state} options={STATES} onChange={(v) => set("state", v)} changed={changed("state")} />
            </div>
            <SwitchRow
              checked={draft.open24}
              onChange={(v) => set("open24", v)}
              title="Open 24 hours, every day"
              hint={draft.open24 ? "Turn off to set opening hours for each day" : "Customers see these hours on the website footer"}
              changed={changed("open24")}
            />
            {!draft.open24 && text("hours", "Opening hours", { placeholder: "Mon–Sat 6 AM to 10 PM, Sun 8 AM to 8 PM" })}
          </Card>

          <Card title="Tax and registration" intro="Needed for GST bills and vendor payouts.">
            <Row>
              {text("gstin", "GSTIN", { maxLength: 15, autoCapitalize: "characters", spellCheck: false })}
              {text("pan", "PAN", { maxLength: 10, autoCapitalize: "characters", spellCheck: false })}
            </Row>
            <SwitchRow checked={draft.showGstin} onChange={(v) => set("showGstin", v)} title="Show GSTIN on booking PDFs" changed={changed("showGstin")} />
          </Card>

          <Card title="Payments" intro="Where customers pay and where payouts come from.">
            <Row>
              {text("upi", "UPI ID", { spellCheck: false })}
              {text("bankAccount", "Bank account (optional)")}
            </Row>
            <SwitchRow
              checked={draft.upiQr}
              onChange={(v) => set("upiQr", v)}
              title="Add a UPI QR to booking PDFs"
              hint="Customers scan and pay at the end of the trip"
              changed={changed("upiQr")}
            />
          </Card>

          <Card title="PDFs and messages" intro="The small print and sign-off on everything you send.">
            <div>
              <label htmlFor="co-terms" className={labelCls}>
                Terms on booking PDF
              </label>
              <textarea
                id="co-terms"
                rows={3}
                value={draft.terms}
                onChange={(e) => set("terms", e.target.value)}
                className={`${inputCls} resize-y ${changed("terms") ? "border-[1.5px] border-brand" : ""}`}
              />
              <p className="mt-1.5 type-body-sm text-helper">One term per line.</p>
            </div>
            {text("signoff", "WhatsApp sign-off")}
          </Card>
        </div>

        {/* Side */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-8">
          <section className={`${cardCls} flex flex-col gap-3 p-6`}>
            <div className="flex items-center gap-2">
              <h2 className="flex-1 type-h4 text-primary">{doneCount === checks.length ? "Profile complete" : "Almost done"}</h2>
              <span className="type-ui text-brand">
                {doneCount} of {checks.length}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-brand" style={{ width: `${(doneCount / checks.length) * 100}%` }} />
            </div>
            <ul className="flex flex-col gap-3">
              {checks.map((s) => (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => document.getElementById(`co-${s.fields[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                    className={`flex items-center gap-2.5 text-left type-body-sm ${s.done ? "text-primary" : "text-error"}`}
                  >
                    <Icon name={s.done ? "check-circle" : "warning-circle"} size={16} className={s.done ? "text-brand" : "text-error"} />
                    {s.done ? s.label : `${s.label} · ${s.problem}`}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${cardCls} flex flex-col gap-3.5 p-6`}>
            <h2 className="type-h4 text-primary">Where this shows</h2>
            <p className="type-body-sm text-secondary">Booking PDF</p>
            <div className="flex flex-col gap-2.5 rounded-md border border-gray-100 p-4">
              <div className="flex items-center gap-2.5">
                {draft.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- uploaded logo preview
                  <img src={draft.logo} alt="" className="size-9 shrink-0 rounded-md object-cover" />
                ) : (
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-brand type-ui text-on-color">{initials(draft)}</span>
                )}
                <div className="min-w-0">
                  <p className="truncate type-ui text-primary">{draft.name || "Business name"}</p>
                  <p className="type-body-sm text-secondary">{draft.tagline}</p>
                </div>
              </div>
              <p className="break-words type-mono-sm text-secondary">{pdfContactLine(draft)}</p>
            </div>
            <p className="type-body-sm text-secondary">WhatsApp message</p>
            <div className="flex flex-col gap-1.5 rounded-md bg-gray-50 p-3.5">
              <p className="type-body-sm text-primary">Your cab is confirmed for Sat 31 Oct, 4:30 AM. Scorpio VLX, driver Rakesh.</p>
              {draft.signoff.trim() && <p className="type-body-sm text-secondary">{draft.signoff}</p>}
            </div>
            <p className="type-body-sm text-secondary">Website footer</p>
            <p className="type-body-sm text-secondary">{footerLine}</p>
          </section>
        </div>
      </div>

      {/* 8.2 — floating unsaved-changes bar */}
      {(dirty || error) && !toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-30 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-gray-100 bg-layer py-3 pl-5 pr-3 shadow-[0_16px_48px_0_var(--shadow-md)] sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-max sm:max-w-[calc(100%-3rem)] sm:-translate-x-1/2 sm:flex-nowrap md:left-[calc(50%+124px)]"
        >
          <div className="min-w-0 flex-1 sm:flex-none">
            <p className="type-ui text-primary">
              {changes.length} unsaved change{changes.length === 1 ? "" : "s"}
            </p>
            {error ? (
              <FormError error={error} />
            ) : (
              <p className="type-body-sm text-secondary">
                {changes.map((c, i) => (i === 0 ? c : c.toLowerCase())).join(", ")}. New PDFs use these after you save.
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={discard} disabled={pending} className={btnGhost}>
              Discard
            </button>
            <button type="button" onClick={save} disabled={pending} className={btnPrimary}>
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}

      {/* 8.4 — saved toast */}
      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-30 flex items-center gap-3 rounded-lg border border-gray-100 bg-layer py-3 pl-3.5 pr-3 drop-shadow-[0_16px_24px_var(--shadow-md)] sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-max sm:-translate-x-1/2 md:left-[calc(50%+124px)]"
        >
          <span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-brand text-on-color">
            <Icon name="check" size={14} />
          </span>
          <p className="min-w-0 flex-1 type-ui text-primary">Company profile saved · new PDFs and messages use it</p>
          {latestBookingId && (
            <Link href={`/admin/bookings/${latestBookingId}/pdf?copy=customer`} className="shrink-0 type-ui text-link hover:text-link-hover">
              View PDF
            </Link>
          )}
          <span className="h-5 w-px shrink-0 bg-gray-200" aria-hidden="true" />
          <button type="button" onClick={() => setToast(false)} aria-label="Dismiss" className="shrink-0 text-[var(--icon-secondary)] hover:text-primary">
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function Card({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <section className={`${cardCls} flex flex-col gap-4 p-6`}>
      <div>
        <h2 className="type-h3 text-primary">{title}</h2>
        <p className="mt-0.5 type-body-sm text-secondary">{intro}</p>
      </div>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

function TextField({
  id,
  label,
  value,
  onChange,
  changed,
  error,
  ...props
}: { id: string; label: string; value: string; onChange: (v: string) => void; changed: boolean; error?: string } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "id" | "value" | "onChange"
>) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputCls} ${changed && !error ? "border-[1.5px] border-brand" : ""}`}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 type-body-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

function SelectField({ id, label, value, options, onChange, changed }: { id: string; label: string; value: string; options: string[]; onChange: (v: string) => void; changed: boolean }) {
  const list = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <div className="relative">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} cursor-pointer appearance-none pr-10 ${changed ? "border-[1.5px] border-brand" : ""}`}>
          {!value && <option value="">Choose…</option>}
          {list.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <Icon name="caret-down" size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--icon-secondary)]" />
      </div>
    </div>
  );
}

// Figma toggle row: grey panel, title + optional hint, switch on the right.
function SwitchRow({ checked, onChange, title, hint, changed }: { checked: boolean; onChange: (v: boolean) => void; title: string; hint?: string; changed: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-md bg-gray-50 px-3.5 py-3.5 ${changed ? "ring-[1.5px] ring-brand" : ""}`}>
      <span className="min-w-0 flex-1">
        <span className="block type-ui text-primary">{title}</span>
        {hint && <span className="block type-body-sm text-secondary">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="shrink-0 rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--border-focus)]">
        <ToggleArt on={checked} />
      </span>
    </label>
  );
}
