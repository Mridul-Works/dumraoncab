"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import Icon from "@/components/admin/Icon";
import { btnGhost, btnPrimary, btnText, inputCls, labelCls } from "@/components/admin/ui";
import { saveVendor, type VendorFormDoc, type VendorFormErrors, type VendorFormInput } from "@/app/admin/vendor-actions";
import { vendorCarModels, vendorCarTypes, vendorFuels, vendorMessages, vendorPins, vendorRegions } from "@/lib/site";
import { CAR_DOCS, PERSON_DOCS, REQUIRED_PERSON_DOCS, type CarDocKind, type PersonDocKind, type Vendor, type VendorDoc, type VendorKind, type WorkPlace } from "@/lib/vendorTypes";
import { PlacesField, UploadBox } from "./FormParts";
import { Card } from "./parts";
import { firstName, joinWords, vendorWa } from "./format";
import VendorToast, { type ToastMsg } from "./VendorToast";

// Figma 6.3 Add vendor · 6.4 missing info · 6.18 Add place. Also the Edit form.

type DocMap = Partial<Record<VendorDoc["kind"], VendorFormDoc>>;
type CarState = { id: string; model: string; number: string; type: string; fuel: string; seats: string; year: string; docs: DocMap };

const digits10 = (m: string) => m.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
const fmtMobile = (m: string) => {
  const d = digits10(m);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : m;
};
const toMap = (docs: VendorDoc[] = []): DocMap =>
  Object.fromEntries(docs.filter((d) => d.file).map((d) => [d.kind, { kind: d.kind, file: d.file, fileName: d.fileName, sizeKb: d.sizeKb, fileBack: d.fileBack, fileBackName: d.fileBackName, validTill: d.validTill }]));
let tmp = 0;
const blankCar = (): CarState => ({ id: `new-${++tmp}`, model: "", number: "", type: "SUV", fuel: "Diesel", seats: "7", year: "", docs: {} });

const UPI = /^[\w.-]{2,}@[a-z][a-z0-9]{1,}$/i;

const PERSON_LABEL: Record<PersonDocKind, string> = { photo: "Profile photo", aadhaar: "Aadhaar card", licence: "Driving licence", pan: "PAN card (optional)" };
const CAR_LABEL: Record<CarDocKind, string> = { rc: "RC (registration)", insurance: "Insurance", permit: "Permit", puc: "PUC (pollution)" };

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1.5 type-body-sm text-error">{msg}</p> : null;
}

export default function VendorForm({ vendor, addCar = false, added }: { vendor?: Vendor; addCar?: boolean; added?: string }) {
  const editing = !!vendor;
  const [kind, setKind] = useState<VendorKind>(vendor?.kind ?? "owner");
  const [name, setName] = useState(vendor?.name ?? "");
  const [mobile, setMobile] = useState(vendor?.mobile ?? "");
  const [altMobile, setAltMobile] = useState(vendor?.altMobile ?? "");
  const [email, setEmail] = useState(vendor?.email ?? "");
  const [docs, setDocs] = useState<DocMap>(toMap(vendor?.docs));
  const a = vendor?.address;
  const [line, setLine] = useState(a?.line ?? "");
  const [pin, setPin] = useState(a?.pin ?? "");
  const [town, setTown] = useState(a?.town ?? "");
  const [state, setState] = useState(a?.state || "Bihar");
  const [district, setDistrict] = useState(a?.district ?? "");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(a?.lat != null && a.lng != null ? { lat: a.lat, lng: a.lng } : null);
  const [spot, setSpot] = useState(a?.pin ? (vendorPins[a.pin]?.spot ?? "") : "");
  const [filled, setFilled] = useState(false);
  const [pinEdit, setPinEdit] = useState(false);
  const [pinText, setPinText] = useState("");
  const [radius, setRadius] = useState<number | null>(vendor ? (vendor.radiusKm === undefined ? 50 : vendor.radiusKm) : 50);
  const [places, setPlaces] = useState<WorkPlace[]>((vendor?.places ?? []).filter((p) => !p.home));
  const [cars, setCars] = useState<CarState[]>(() => {
    const list: CarState[] = (vendor?.cars ?? []).map((c) => ({
      id: c.id,
      model: c.model,
      number: c.number,
      type: c.type,
      fuel: c.fuel,
      seats: c.seats ? String(c.seats) : "",
      year: c.year ? String(c.year) : "",
      docs: toMap(c.docs),
    }));
    if (!vendor || addCar) list.push(blankCar());
    return list;
  });
  const [upi, setUpi] = useState(vendor?.upi ?? "");
  const [pan, setPan] = useState(vendor?.pan ?? "");
  const [errors, setErrors] = useState<VendorFormErrors>({});
  const [tried, setTried] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<ToastMsg | null>(() => (added ? { text: `${added} added · Pending until their documents are checked`, key: 1 } : null));
  const [pending, start] = useTransition();

  // ---- Validation (same rules as saveVendor on the server) ----
  function check(): VendorFormErrors {
    const e: VendorFormErrors = {};
    if (!name.trim()) e.name = "Enter their full name";
    const m = digits10(mobile);
    if (!m) e.mobile = "Enter their mobile number";
    else if (m.length !== 10) e.mobile = "Enter all 10 digits";
    const alt = digits10(altMobile);
    if (alt && alt.length !== 10) e.altMobile = "Enter all 10 digits";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Check the email address";
    if (!docs.aadhaar?.file) e.aadhaar = "Needed before approval";
    if (!upi.trim()) e.upi = "Add a UPI ID so we can pay them";
    else if (!UPI.test(upi.trim())) e.upi = "A UPI ID looks like name@bank";
    if (pin && !/^\d{6}$/.test(pin)) e.pin = "PIN codes have 6 digits";
    if (kind === "owner" && !cars.length) e.cars = "Add the car they will run";
    cars.forEach((c, i) => {
      if (!c.model.trim()) e[`car${i}.model`] = "Choose the car model";
      if (!c.number.trim()) e[`car${i}.number`] = "Enter the car number";
    });
    return e;
  }
  // Client rules update as staff type; server-only errors (number already used) stay until the next save.
  const shown: VendorFormErrors = tried ? { ...errors, ...check() } : {};
  const err = (k: string) => shown[k];

  function onPin(value: string) {
    const v = value.replace(/\D/g, "").slice(0, 6);
    setPin(v);
    const hit = vendorPins[v];
    if (hit) {
      setTown((t) => t || hit.town);
      setState(hit.state);
      setDistrict(hit.district);
      setGeo({ lat: hit.lat, lng: hit.lng });
      setSpot(hit.spot);
      setFilled(true);
    } else {
      setFilled(false);
      if (v.length === 6 && /^(80|84|85)/.test(v)) setState("Bihar");
      if (v.length === 6 && /^2[0-8]/.test(v)) setState("Uttar Pradesh");
    }
  }

  function applyPinText() {
    const m = /(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/.exec(pinText);
    if (!m) return;
    setGeo({ lat: Number(m[1]), lng: Number(m[2]) });
    setSpot("");
    setPinEdit(false);
  }

  // Changing the range re-marks which places are "on request".
  function setRange(r: number | null) {
    setRadius(r);
    setPlaces((list) => list.map((p) => ({ ...p, onRequest: r !== null && p.km !== undefined && p.km > r })));
  }

  const setCar = (i: number, patch: Partial<CarState>) => setCars((list) => list.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  // ---- Summary card ----
  const docsTotal = REQUIRED_PERSON_DOCS.length + cars.length * CAR_DOCS.length;
  const personUp = REQUIRED_PERSON_DOCS.filter((k) => docs[k]?.file);
  const carMissing = cars.flatMap((c) => CAR_DOCS.filter((k) => !c.docs[k]?.file));
  const docsUp = personUp.length + cars.length * CAR_DOCS.length - carMissing.length;
  const missingNames = [
    ...REQUIRED_PERSON_DOCS.filter((k) => !docs[k]?.file).map((k) => (k === "licence" ? "driving licence" : k === "photo" ? "photo" : "Aadhaar")),
    ...[...new Set(carMissing)].map((k) => ({ rc: "RC", insurance: "insurance", permit: "permit", puc: "PUC" })[k as CarDocKind]),
  ];
  const later = missingNames.filter((n) => n !== "Aadhaar");
  const laterText = later.length ? `${joinWords(later).replace(/^./, (c) => c.toUpperCase())} can be added later` : "";

  const personErrs = [err("name") && "Name is missing", err("mobile") && (digits10(mobile) ? "Mobile number is short" : "Mobile number is missing"), err("aadhaar") && "Aadhaar missing"].filter(Boolean) as string[];
  const n = cars.length;
  const summary: { title: string; text: string; tone: "ok" | "warn" | "bad" }[] = [
    {
      title: "Person",
      text: personErrs.length ? personErrs.join(" · ") : ["Name", "mobile", docs.photo?.file && "photo", docs.aadhaar?.file && "Aadhaar"].filter(Boolean).join(", "),
      tone: personErrs.length ? "bad" : name && digits10(mobile).length === 10 && docs.aadhaar?.file ? "ok" : "warn",
    },
    {
      title: "Location",
      text: town
        ? [`${town}${state ? `, ${state}` : ""}`, geo ? "pinned" : "", `${places.length + 1} place${places.length ? "s" : ""}${radius ? ` within ${radius} km` : ""}`].filter(Boolean).join(" · ")
        : "Add the town they live in",
      tone: town ? "ok" : "warn",
    },
    {
      title: n ? `${n} car${n > 1 ? "s" : ""}` : "No car yet",
      text: n ? cars.map((c) => [c.model, c.number].filter(Boolean).join(" · ") || "Details to fill").join(", ") : kind === "owner" ? "Add the car they will run" : "Drivers can join without a car",
      tone: Object.keys(shown).some((k) => k.startsWith("car")) ? "bad" : n || kind === "driver" ? "ok" : "warn",
    },
    {
      title: `${docsUp} of ${docsTotal} documents`,
      text: err("aadhaar") ? `Aadhaar is needed now.${laterText ? ` ${laterText.replace(" can be added later", "")} can come later` : ""}` : laterText || "All uploaded",
      tone: err("aadhaar") ? "warn" : docsUp === docsTotal ? "ok" : "warn",
    },
    { title: "Payout", text: err("upi") ? "Add a UPI ID" : upi ? `UPI ${upi}` : "Add a UPI ID", tone: err("upi") ? "bad" : UPI.test(upi.trim()) ? "ok" : "warn" },
  ];

  // ---- Error banner (6.4) ----
  const phrases: string[] = [];
  if (err("name")) phrases.push("full name is missing");
  if (err("mobile")) phrases.push(digits10(mobile) ? (err("mobile")!.includes("already") ? "the mobile number is already used" : "mobile number is short") : "mobile number is missing");
  if (err("altMobile")) phrases.push("alternate number is short");
  if (err("email")) phrases.push("the email looks wrong");
  if (err("aadhaar")) phrases.push("Aadhaar card is missing");
  if (err("pin")) phrases.push("the PIN code is short");
  if (err("cars")) phrases.push("there is no car");
  cars.forEach((_, i) => {
    if (err(`car${i}.model`) || err(`car${i}.number`)) phrases.push(`car ${i + 1} needs its ${[err(`car${i}.model`) && "model", err(`car${i}.number`) && "number"].filter(Boolean).join(" and ")}`);
  });
  if (err("upi")) phrases.push(upi.trim() ? "the UPI ID looks wrong" : "there is no UPI ID");
  const bannerText = phrases.length ? `${joinWords(phrases).replace(/^./, (c) => c.toUpperCase())}. Each one is marked in red below.` : "";

  function submit(next?: "another") {
    setTried(true);
    setFormError("");
    const e = check();
    setErrors({});
    if (Object.keys(e).length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // New vendor: open the "you're registered" WhatsApp now (inside the click, so it isn't blocked).
    const welcomed = !editing;
    if (welcomed) window.open(vendorWa(mobile, vendorMessages.added(firstName(name))), "_blank", "noopener,noreferrer");
    const input: VendorFormInput = {
      id: vendor?.id,
      kind,
      name,
      mobile,
      altMobile,
      email,
      address: { line, town, district, state, pin, ...(geo ?? {}) },
      radiusKm: radius,
      places: [{ name: town.trim(), home: true, km: 0 }, ...places].filter((p) => p.name),
      docs: PERSON_DOCS.map((k) => ({ ...(docs[k] ?? {}), kind: k })),
      cars: cars.map((c) => ({ ...c, docs: CAR_DOCS.map((k) => ({ ...(c.docs[k] ?? {}), kind: k })) })),
      upi,
      pan,
      next,
      welcomed,
    };
    start(async () => {
      const res = await saveVendor(input);
      if (res?.errors) {
        setErrors(res.errors);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (res?.error) setFormError(res.error);
    });
  }

  const docError = (msg: string) => setFormError(msg);
  const districts = vendorRegions[state] ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href={vendor ? `/admin/vendors/${vendor.id}` : "/admin/vendors"} className="inline-flex items-center gap-1.5 type-ui text-link hover:text-link-hover">
            <Icon name="arrow-left" size={16} />
            {vendor ? vendor.name : "Vendors"}
          </Link>
          <h1 className="mt-1 type-h1 text-primary">{editing ? "Edit vendor" : "Add vendor"}</h1>
        </div>
        <Link href={vendor ? `/admin/vendors/${vendor.id}` : "/admin/vendors"} className={btnGhost}>
          Cancel
        </Link>
      </div>

      {tried && phrases.length > 0 && (
        <div role="alert" className="flex gap-3 rounded-lg bg-tag-red px-4 py-3.5">
          <Icon name="warning-circle" size={20} className="shrink-0 text-error" />
          <div>
            <p className="type-ui text-primary">
              Fix {phrases.length} thing{phrases.length > 1 ? "s" : ""} to save{name.trim() ? ` ${name.trim()}` : ""}
            </p>
            <p className="type-body-sm text-secondary">{bannerText}</p>
          </div>
        </div>
      )}
      {formError && (
        <p role="alert" className="rounded-lg bg-tag-red px-4 py-3.5 type-ui text-error">
          {formError}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Person */}
          <Card title="Person" sub="Who is joining. Their mobile number is their login.">
            <div role="radiogroup" aria-label="Vendor type" className="mt-1 grid gap-1 rounded-lg bg-gray-50 p-1 sm:grid-cols-2">
              {(
                [
                  { id: "owner", label: "Owner", hint: "Owns cars, may drive or hire drivers" },
                  { id: "driver", label: "Driver", hint: "Drives a car, owns none or one" },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={kind === o.id}
                  onClick={() => setKind(o.id)}
                  className={`rounded-md px-3.5 py-2.5 text-left transition-colors ${kind === o.id ? "border border-gray-100 bg-layer shadow-[0_1px_2px_var(--shadow-sm)]" : "hover:bg-layer-hover"}`}
                >
                  <span className="block type-ui text-primary">{o.label}</span>
                  <span className="block type-body-sm text-secondary">{o.hint}</span>
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="v-name" className={labelCls}>
                  Full name
                </label>
                <input id="v-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!err("name")} className={inputCls} autoComplete="off" />
                <Err msg={err("name")} />
              </div>
              <div>
                <label htmlFor="v-mobile" className={labelCls}>
                  Mobile number
                </label>
                <input
                  id="v-mobile"
                  type="tel"
                  inputMode="tel"
                  value={mobile}
                  onChange={(e) => (setMobile(e.target.value), setErrors({}))}
                  onBlur={() => setMobile(fmtMobile(mobile))}
                  aria-invalid={!!err("mobile")}
                  placeholder="+91"
                  className={inputCls}
                />
                <Err msg={err("mobile")} />
              </div>
              <div>
                <label htmlFor="v-email" className={labelCls}>
                  Email (optional)
                </label>
                <input id="v-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err("email")} className={inputCls} />
                <Err msg={err("email")} />
              </div>
              <div>
                <label htmlFor="v-alt" className={labelCls}>
                  Alternate number (optional)
                </label>
                <input
                  id="v-alt"
                  type="tel"
                  inputMode="tel"
                  value={altMobile}
                  onChange={(e) => setAltMobile(e.target.value)}
                  onBlur={() => setAltMobile(fmtMobile(altMobile))}
                  aria-invalid={!!err("altMobile")}
                  placeholder="+91"
                  className={inputCls}
                />
                <Err msg={err("altMobile")} />
              </div>
            </div>
            <p className="type-ui text-primary">Person documents</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {PERSON_DOCS.map((k) => (
                <UploadBox
                  key={k}
                  label={PERSON_LABEL[k]}
                  doc={docs[k]}
                  twoSides={k === "aadhaar"}
                  error={k === "aadhaar" ? err("aadhaar") : undefined}
                  onChange={(d) => setDocs({ ...docs, [k]: d && { ...d, kind: k } })}
                  onError={docError}
                />
              ))}
            </div>
          </Card>

          {/* Location */}
          <Card title="Location" sub="Where they live and the places they can take trips from.">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
              <div>
                <label htmlFor="v-line" className={labelCls}>
                  House, street and landmark
                </label>
                <input id="v-line" value={line} onChange={(e) => setLine(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label htmlFor="v-pin" className={labelCls}>
                  PIN code
                </label>
                <input id="v-pin" inputMode="numeric" value={pin} onChange={(e) => onPin(e.target.value)} aria-invalid={!!err("pin")} className={inputCls} />
                <Err msg={err("pin")} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="v-town" className={labelCls}>
                  Town or village
                </label>
                <input id="v-town" value={town} onChange={(e) => setTown(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label htmlFor="v-district" className={labelCls}>
                  District
                </label>
                {districts.length ? (
                  <select id="v-district" value={district} onChange={(e) => setDistrict(e.target.value)} className={inputCls}>
                    <option value="">Choose</option>
                    {district && !districts.includes(district) && <option>{district}</option>}
                    {districts.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                ) : (
                  <input id="v-district" value={district} onChange={(e) => setDistrict(e.target.value)} className={inputCls} />
                )}
              </div>
              <div>
                <label htmlFor="v-state" className={labelCls}>
                  State
                </label>
                <select id="v-state" value={state} onChange={(e) => (setState(e.target.value), setDistrict(""))} className={inputCls}>
                  {!vendorRegions[state] && <option>{state}</option>}
                  {Object.keys(vendorRegions).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            {filled && (
              <p className="flex items-center gap-1.5 type-body-sm text-secondary">
                <Icon name="check-circle-14" size={14} className="text-brand" />
                District and state filled from the PIN code
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3.5 rounded-md border border-gray-100 bg-gray-50 p-3 sm:flex-nowrap">
              {/* eslint-disable-next-line @next/next/no-img-element -- static map thumbnail */}
              <img src="/admin-art/mini-map.svg" alt="" width={88} height={64} className={`block h-16 w-22 shrink-0 ${geo ? "" : "opacity-40"}`} />
              <div className="min-w-0 flex-1">
                {pinEdit ? (
                  <>
                    <label htmlFor="v-geo" className="type-ui text-primary">
                      Paste the pin from Google Maps
                    </label>
                    <input
                      id="v-geo"
                      autoFocus
                      value={pinText}
                      onChange={(e) => setPinText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyPinText())}
                      placeholder="25.5533, 84.1513"
                      className={`${inputCls} mt-1`}
                    />
                  </>
                ) : geo ? (
                  <>
                    <p className="type-ui text-primary">Pinned on the map</p>
                    <p className="type-body-sm text-secondary">{spot ? `Near ${spot} · ` : ""}drivers get this pin for pickups</p>
                    <p className="type-mono-sm text-secondary">
                      {geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="type-ui text-primary">Not pinned yet</p>
                    <p className="type-body-sm text-secondary">Enter the PIN code, or paste a pin from Google Maps so drivers get it for pickups</p>
                  </>
                )}
              </div>
              {pinEdit ? (
                <button type="button" className={btnGhost} onClick={applyPinText}>
                  Use this pin
                </button>
              ) : (
                <button type="button" className={btnGhost} onClick={() => (setPinText(geo ? `${geo.lat}, ${geo.lng}` : ""), setPinEdit(true))}>
                  <Icon name="map-pin" size={16} />
                  {geo ? "Change pin" : "Add pin"}
                </button>
              )}
            </div>
            <hr className="border-gray-100" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="type-ui text-primary">Works around</p>
                <p className="type-body-sm text-secondary">Places they will take trips from</p>
              </div>
              <div role="radiogroup" aria-label="Distance" className="flex gap-0.5 rounded-full bg-gray-50 p-1">
                {([10, 25, 50, null] as const).map((r) => (
                  <button
                    key={String(r)}
                    type="button"
                    role="radio"
                    aria-checked={radius === r}
                    onClick={() => setRange(r)}
                    className={`rounded-full px-3 py-1.5 type-body-sm transition-colors ${radius === r ? "bg-layer text-primary shadow-[0_1px_2px_var(--shadow-sm)]" : "text-secondary hover:text-primary"}`}
                  >
                    {r ? `${r} km` : "Any"}
                  </button>
                ))}
              </div>
            </div>
            <PlacesField home={town.trim()} pin={geo} radius={radius} places={places} onChange={setPlaces} />
          </Card>

          {/* Cars */}
          <section id="cars" className="scroll-mt-6">
            <Card
              title="Cars"
              sub="Add each car they will run with us. Car documents go with the car."
              action={
                <button type="button" onClick={() => setCars([...cars, blankCar()])} className={`${btnText} px-5 py-2.5`}>
                  <Icon name="plus" size={16} />
                  Add {cars.length ? "another " : ""}car
                </button>
              }
            >
              {cars.length === 0 && <p className={`type-body-sm ${err("cars") ? "text-error" : "text-secondary"}`}>{err("cars") ?? "No car yet. Drivers can join without one."}</p>}
              {cars.map((c, i) => (
                <div key={c.id} className="flex flex-col gap-4 rounded-lg bg-gray-50 p-4 md:p-5">
                  <div className="flex items-center gap-2.5">
                    <Icon name="car-simple-24" size={20} className="text-[var(--icon-primary)]" />
                    <p className="min-w-0 flex-1 truncate type-ui text-primary">
                      Car {i + 1}
                      {c.model ? ` · ${c.model}` : ""}
                    </p>
                    <button type="button" onClick={() => setCars(cars.filter((x) => x !== c))} className="rounded-full px-5 py-2.5 type-ui text-tag-red hover:bg-tag-red">
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`c${i}-model`} className={labelCls}>
                        Car model
                      </label>
                      <input id={`c${i}-model`} list="vendor-car-models" value={c.model} onChange={(e) => setCar(i, { model: e.target.value })} aria-invalid={!!err(`car${i}.model`)} className={inputCls} />
                      <Err msg={err(`car${i}.model`)} />
                    </div>
                    <div>
                      <label htmlFor={`c${i}-number`} className={labelCls}>
                        Car number
                      </label>
                      <input
                        id={`c${i}-number`}
                        value={c.number}
                        onChange={(e) => setCar(i, { number: e.target.value.toUpperCase() })}
                        aria-invalid={!!err(`car${i}.number`)}
                        placeholder="BR 44 AB 1234"
                        className={inputCls}
                      />
                      <Err msg={err(`car${i}.number`)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <label htmlFor={`c${i}-type`} className={labelCls}>
                        Type
                      </label>
                      <select id={`c${i}-type`} value={c.type} onChange={(e) => setCar(i, { type: e.target.value })} className={inputCls}>
                        {!vendorCarTypes.includes(c.type) && <option>{c.type}</option>}
                        {vendorCarTypes.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`c${i}-fuel`} className={labelCls}>
                        Fuel
                      </label>
                      <select id={`c${i}-fuel`} value={c.fuel} onChange={(e) => setCar(i, { fuel: e.target.value })} className={inputCls}>
                        {!vendorFuels.includes(c.fuel) && <option>{c.fuel}</option>}
                        {vendorFuels.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`c${i}-seats`} className={labelCls}>
                        Seats
                      </label>
                      <input id={`c${i}-seats`} inputMode="numeric" value={c.seats} onChange={(e) => setCar(i, { seats: e.target.value.replace(/\D/g, "").slice(0, 2) })} className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor={`c${i}-year`} className={labelCls}>
                        Year
                      </label>
                      <input id={`c${i}-year`} inputMode="numeric" value={c.year} onChange={(e) => setCar(i, { year: e.target.value.replace(/\D/g, "").slice(0, 4) })} className={inputCls} />
                    </div>
                  </div>
                  <p className="type-ui text-primary">Car documents</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {CAR_DOCS.map((k) => (
                      <UploadBox
                        key={k}
                        label={CAR_LABEL[k]}
                        doc={c.docs[k]}
                        onChange={(d) => setCar(i, { docs: { ...c.docs, [k]: d && { ...d, kind: k } } })}
                        onError={docError}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <datalist id="vendor-car-models">
                {vendorCarModels.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Card>
          </section>

          {/* Payout */}
          <Card title="Payout" sub="Where we send their share after trips.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="v-upi" className={labelCls}>
                  UPI ID
                </label>
                <input id="v-upi" value={upi} onChange={(e) => setUpi(e.target.value.trim())} aria-invalid={!!err("upi")} placeholder="name@bank" className={inputCls} />
                <Err msg={err("upi")} />
              </div>
              <div>
                <label htmlFor="v-pan" className={labelCls}>
                  PAN (optional)
                </label>
                <input id="v-pan" value={pan} onChange={(e) => setPan(e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 10))} className={inputCls} />
              </div>
            </div>
          </Card>
        </div>

        {/* Summary */}
        <aside className="flex flex-col gap-4 rounded-lg border border-gray-100 bg-layer p-5 lg:sticky lg:top-6">
          <h2 className="type-h4 text-primary">Summary</h2>
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-gray-100 bg-layer text-[var(--icon-primary)]">
              <Icon name="user" size={20} />
            </span>
            <div className="min-w-0">
              <p className="truncate type-ui text-primary">{name.trim() || "New vendor"}</p>
              <p className="truncate type-body-sm text-secondary">
                {[kind === "owner" ? "Owner" : "Driver", town.trim(), `${n} car${n === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <hr className="border-gray-100" />
          <ul className="flex flex-col gap-4">
            {summary.map((s) => (
              <li key={s.title} className="flex gap-2.5">
                <Icon
                  name={s.tone === "ok" ? "check-circle-14" : "warning-circle-14"}
                  size={18}
                  className={s.tone === "ok" ? "text-brand" : s.tone === "bad" ? "text-error" : "text-tag-amber"}
                />
                <div className="min-w-0">
                  <p className="type-ui text-primary">{s.title}</p>
                  <p className={`type-body-sm ${s.tone === "bad" ? "text-error" : "text-secondary"}`}>{s.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="rounded-md bg-gray-50 p-3 type-body-sm text-secondary">
            {editing
              ? "New or replaced documents go back to Needs review until staff check them."
              : "The vendor stays Pending until all documents are uploaded and checked. They can’t take trips before that."}
          </p>
          <button type="button" className={`${btnPrimary} w-full`} onClick={() => submit()} disabled={pending}>
            <Icon name="check" size={16} />
            {pending ? "Saving…" : editing ? "Save changes" : "Save vendor"}
          </button>
          {!editing && (
            <button type="button" className={`${btnText} justify-center`} onClick={() => submit("another")} disabled={pending}>
              Save and add another
            </button>
          )}
        </aside>
      </div>
      <VendorToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
