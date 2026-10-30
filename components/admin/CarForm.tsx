"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { removeCar, saveCar, uploadCarPhoto } from "@/app/admin/fleet-actions";
import FleetCard, { ToggleArt, carMeta } from "@/components/admin/FleetCard";
import Icon from "@/components/admin/Icon";
import { FormError, btnDanger, btnGhost, btnPrimary, cardCls, inputCls, labelCls } from "@/components/admin/ui";
import { CAR_TYPES, optimisableImage, perKmLabel, type Car, type FareClass } from "@/lib/catalogTypes";

const TRANSMISSIONS = ["Manual", "Automatic"];
const FUELS = ["Petrol", "Diesel", "CNG", "Electric"];
const ON_REQUEST = "none"; // select value for "no fixed rate" (stored as "")

// Figma "Input" select: native select with the caret-down asset on the right.
function Select({ id, value, onChange, placeholder, children }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select id={id} required={!!placeholder} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} cursor-pointer appearance-none pr-10 ${value ? "" : "text-secondary"}`}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      <Icon name="caret-down" size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--icon-secondary)]" />
    </div>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className={labelCls}>
      {children}
    </label>
  );
}

// Figma toggle row: switch + title + one-line hint.
function SwitchRow({ name, checked, onChange, title, hint }: { name: string; checked: boolean; onChange: (v: boolean) => void; title: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 pt-1">
      <input type="checkbox" name={name} role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="shrink-0 rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--border-focus)]">
        <ToggleArt on={checked} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block type-ui text-primary">{title}</span>
        <span className="block type-body-sm text-secondary">{hint}</span>
      </span>
    </label>
  );
}

const fileName = (src: string) => decodeURIComponent(src.split(/[?#]/)[0].split("/").pop() || "photo");

// Add car (car undefined) and Edit car share this form. The right column is a
// live preview of the public car card.
export default function CarForm({ car, fareClasses }: { car?: Car; fareClasses: FareClass[] }) {
  const [state, action, saving] = useActionState(saveCar, undefined);
  const [name, setName] = useState(car?.name ?? "");
  const [type, setType] = useState<string>(car?.type ?? "");
  const [transmission, setTransmission] = useState(car?.transmission || "Manual");
  const [fuel, setFuel] = useState(car?.fuel ?? "");
  const [seats, setSeats] = useState(car?.seats ?? "");
  const [fareChoice, setFareChoice] = useState(car ? car.fareClass || ON_REQUEST : "");
  const [image, setImage] = useState(car?.image ?? "");
  const [shown, setShown] = useState(car?.shown ?? true);
  const [showLink, setShowLink] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploading, startUpload] = useTransition();
  const [deleting, startDelete] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = saving || uploading || deleting;

  const fareClass = fareChoice === ON_REQUEST ? "" : fareChoice;
  const cls = fareClasses.find((c) => c.id === fareClass);
  const rateLabel = cls ? perKmLabel(cls.rate) : fareChoice === ON_REQUEST ? "On request" : "₹–/km";
  const imageOk = /^https:\/\/\S+$/.test(image) || image.startsWith("/uploads/");
  // Keep CAR_TYPES/TRANSMISSIONS/FUELS options valid for older data.
  const transmissions = TRANSMISSIONS.includes(transmission) ? TRANSMISSIONS : [transmission, ...TRANSMISSIONS];
  const fuels = !fuel || FUELS.includes(fuel) ? FUELS : [fuel, ...FUELS];

  function onFile(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    const fd = new FormData();
    fd.set("photo", file);
    startUpload(async () => {
      const res: { url?: string; error?: string } = await uploadCarPhoto(fd).catch(() => ({ error: "Upload failed — check the file is under 4 MB." }));
      if (res.url) setImage(res.url);
      else setUploadError(res.error ?? "Upload failed.");
      if (fileInput.current) fileInput.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <form action={action} className={`${cardCls} flex min-w-0 flex-1 flex-col gap-4 p-5 md:p-6`}>
        {car && <input type="hidden" name="id" value={car.id} />}
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="transmission" value={transmission} />
        <input type="hidden" name="fuel" value={fuel} />
        <input type="hidden" name="fareClass" value={fareClass} />
        <input type="hidden" name="image" value={image} />

        <div className={`grid gap-3.5 ${car ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <div>
            <Label htmlFor="car-name">Car name</Label>
            <input id="car-name" name="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder={car ? undefined : "e.g. Scorpio VLX"} className={inputCls} />
          </div>
          {car && (
            <div>
              <Label htmlFor="car-number">Car number</Label>
              <input id="car-number" name="number" defaultValue={car.number} placeholder="BR 44 A 1234" className={`${inputCls} uppercase`} />
            </div>
          )}
          <div>
            <Label htmlFor="car-type">Type</Label>
            <Select id="car-type" value={type} onChange={setType} placeholder="Choose type">
              {CAR_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-3">
          <div>
            <Label htmlFor="car-trans">Transmission</Label>
            <Select id="car-trans" value={transmission} onChange={setTransmission}>
              {transmissions.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="car-fuel">Fuel</Label>
            <Select id="car-fuel" value={fuel} onChange={setFuel} placeholder="Choose fuel">
              {fuels.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="car-seats">Seats</Label>
            <input id="car-seats" name="seats" value={seats} onChange={(e) => setSeats(e.target.value)} placeholder={car ? undefined : "e.g. 7 seats"} className={inputCls} />
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <Label htmlFor="car-rate">Rate per km (₹)</Label>
            {/* The rate belongs to the fare class (edited on the Fares page), so it follows the class picked here. */}
            <input
              id="car-rate"
              readOnly
              value={cls ? String(cls.rate) : fareChoice === ON_REQUEST ? "On request" : ""}
              title="Set by the fare class — change prices on the Fares page."
              className={`${inputCls} cursor-default`}
            />
          </div>
          <div>
            <Label htmlFor="car-class">Fare class</Label>
            <Select id="car-class" value={fareChoice} onChange={setFareChoice} placeholder="Choose class">
              {fareClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value={ON_REQUEST}>On request (no fixed rate)</option>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="car-note">Short description</Label>
          <textarea id="car-note" name="note" maxLength={160} defaultValue={car?.note} rows={3} className={`${inputCls} h-24 resize-none`} />
        </div>

        <div>
          <span className={labelCls}>Photo</span>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onFile(e.target.files?.[0])} className="sr-only" id="car-file" tabIndex={-1} />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              onFile(e.dataTransfer.files?.[0]);
            }}
            className={`flex flex-wrap items-center gap-3.5 rounded-lg border-[1.5px] border-dashed p-4 transition-colors ${
              dragging ? "border-focus bg-selected" : "border-gray-100 bg-gray-50"
            }`}
          >
            <label htmlFor="car-file" className="relative grid h-16 w-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-md bg-layer-accent text-[var(--icon-secondary)]">
              {image && imageOk ? (
                <Image src={image} alt="Car photo preview" fill sizes="96px" unoptimized={!optimisableImage(image)} className="object-cover" />
              ) : (
                <Icon name={image ? "car-simple-24" : "upload-simple"} size={24} />
              )}
              {uploading && <span className="absolute inset-0 grid place-items-center bg-layer/80 type-body-sm text-primary">…</span>}
            </label>
            <label htmlFor="car-file" className="min-w-[10rem] flex-1 cursor-pointer">
              <span className="block truncate type-ui text-primary">
                {uploading ? "Uploading…" : image ? fileName(image) : "Drop a photo or click to upload"}
              </span>
              <span className="block type-body-sm text-secondary">Real photo of this car. JPG, PNG or WebP, landscape, up to 4 MB.</span>
            </label>
            {image && (
              <button type="button" disabled={uploading} onClick={() => fileInput.current?.click()} className={btnGhost}>
                Replace
              </button>
            )}
          </div>
          <div className="mt-1.5">
            {showLink ? (
              <input
                aria-label="Photo link"
                value={image}
                onChange={(e) => setImage(e.target.value.trim())}
                placeholder="https://res.cloudinary.com/…"
                className={`${inputCls} type-mono-sm`}
              />
            ) : (
              <button type="button" onClick={() => setShowLink(true)} className="type-body-sm text-link hover:text-link-hover">
                Or paste a photo link
              </button>
            )}
          </div>
          <div className="mt-1.5">
            <FormError error={uploadError} />
          </div>
        </div>

        <SwitchRow
          name="shown"
          checked={shown}
          onChange={setShown}
          title="Shown on website"
          hint="Turn off to hide it from /fleet and the booking form without deleting it."
        />

        <FormError error={state?.error} />

        <div className="flex flex-wrap items-center gap-2.5 pt-2">
          {car && (
            <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)} className={btnDanger}>
              <Icon name="trash" size={16} />
              {deleting ? "Deleting…" : "Delete car"}
            </button>
          )}
          <span className="flex-1" />
          <Link href="/admin/fleet" className={btnGhost}>
            Cancel
          </Link>
          <button type="submit" disabled={busy} className={btnPrimary}>
            {saving ? "Saving…" : car ? "Save changes" : "Add car"}
          </button>
        </div>
      </form>

      <aside className="flex w-full shrink-0 flex-col gap-3 lg:sticky lg:top-8 lg:w-[354px]" aria-label="Preview on /fleet">
        <h2 className="type-h4 text-primary">Preview on /fleet</h2>
        <FleetCard
          name={name.trim() || "New car"}
          rate={rateLabel}
          meta={carMeta({ type, transmission, fuel, seats })}
          image={image && imageOk ? image : undefined}
          shown={shown}
        />
        <p className="type-body-sm text-secondary">{car || name ? "This is how customers see the car." : "Fill the form to see the card."}</p>
      </aside>

      {confirmDelete && car && (
        <DeleteDialog
          name={car.name}
          busy={deleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => startDelete(() => removeCar(car.id))}
        />
      )}
    </div>
  );
}

// Figma "Confirm modal" (4.4 Delete car · confirm).
function DeleteDialog({ name, busy, onCancel, onConfirm }: { name: string; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    keep.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button type="button" aria-label="Keep car" onClick={onCancel} className="absolute inset-0 cursor-default bg-scrim [animation:fade_.15s_ease-out]" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-car-title"
        aria-describedby="delete-car-desc"
        className="relative flex w-full max-w-[460px] flex-col gap-3 rounded-xl bg-layer px-7 pb-6 pt-7 shadow-[0_32px_96px_-16px_var(--shadow-lg),0_12px_24px_-8px_var(--shadow-md)] [animation:pop_.15s_ease-out]"
      >
        <span className="grid size-11 place-items-center rounded-full bg-tag-red text-error">
          <Icon name="trash-22" size={22} />
        </span>
        <h2 id="delete-car-title" className="type-h4 text-primary">
          Delete {name}?
        </h2>
        <p id="delete-car-desc" className="type-body-sm text-secondary">
          It disappears from /fleet and the booking form right away. Past bookings keep the car name. To take it off the site for a while, switch off “Shown on
          website” instead.
        </p>
        <div className="flex flex-wrap justify-end gap-2.5 pt-2.5">
          <button ref={keep} type="button" onClick={onCancel} disabled={busy} className={btnGhost}>
            Keep car
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--button-danger-primary)] px-5 py-2.5 type-ui text-on-color transition-colors hover:bg-[var(--button-danger-hover)] active:bg-[var(--button-danger-active)] disabled:opacity-40"
          >
            {busy ? "Deleting…" : "Delete car"}
          </button>
        </div>
      </div>
    </div>
  );
}
