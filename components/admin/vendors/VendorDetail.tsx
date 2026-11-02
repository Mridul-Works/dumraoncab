"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { NumberPlate, btnDanger, btnGhost, btnPrimary, btnText } from "@/components/admin/ui";
import { reactivateVendor, undoVendorChange, uploadDocFor } from "@/app/admin/vendor-actions";
import { inr } from "@/lib/catalogTypes";
import { CAR_DOCS, DOC_LABELS, carReady, docBadge, findDoc, type Vendor } from "@/lib/vendorTypes";
import DocReviewDrawer from "./DocReviewDrawer";
import { ArtBanner, Card, DocTag, KindTag, Notice, VendorStatusBadge } from "./parts";
import { ApproveDialog, RejectDialog, SuspendDialog, type Upcoming } from "./VendorDialogs";
import VendorToast, { type ToastMsg } from "./VendorToast";
import {
  allDocs,
  approvalBlocked,
  awaitingReupload,
  carDocLine,
  dayMonth,
  docDetail,
  docPhrase,
  docUrl,
  firstName,
  fullDate,
  joinWords,
  maskPan,
  missingDocs,
  placeLine,
  telHref,
  toCheck,
  vendorWa,
  weekdayDate,
  type DocItem,
} from "./format";

// Figma 6.2 Vendor detail and its states: 6.6 document review drawer, 6.7–6.11
// approve / reject / suspend, 6.16 rejected, 6.17 asked to re-upload.
// ?doc=<kind>[:<carId>] opens a document in the review drawer.

const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const refKey = (i: DocItem) => (i.ref.carId ? `${i.ref.kind}:${i.ref.carId}` : i.ref.kind);
const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

function InfoRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon name={icon} size={20} className="shrink-0 text-[var(--icon-primary)]" />
      <div className="min-w-0 flex-1">
        <p className="type-body-sm text-secondary">{label}</p>
        {children}
      </div>
    </div>
  );
}

function UploadButton({ vendorId, item, onDone }: { vendorId: string; item: DocItem; onDone: (text: string) => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <label className={`${btnGhost} cursor-pointer ${pending ? "opacity-60" : ""}`} title={error || undefined}>
      <input
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={pending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const fd = new FormData();
          fd.set("id", vendorId);
          if (item.ref.carId) fd.set("carId", item.ref.carId);
          fd.set("kind", item.ref.kind);
          fd.set("file", file);
          start(async () => {
            const res = await uploadDocFor(fd);
            if (res.error) {
              setError(res.error);
              onDone(res.error);
            } else onDone(`${docPhrase(item, true)} uploaded · check it next`);
          });
        }}
      />
      {pending ? "Uploading…" : "Upload"}
    </label>
  );
}

export default function VendorDetail({ vendor: v, upcoming, today, suspendNote }: { vendor: Vendor; upcoming: Upcoming[]; today: string; suspendNote: string }) {
  const params = useSearchParams();
  const items = allDocs(v);
  const docParam = params.get("doc");
  const [open, setOpen] = useState<string | null>(docParam);
  const [dialog, setDialog] = useState<"approve" | "reject" | "suspend" | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(() => (params.get("saved") ? { text: "Vendor details saved", key: 1 } : null));
  const [, start] = useTransition();
  const cleaned = useRef(false);

  // Keep the open document in the URL so a refresh or a shared link reopens it.
  useEffect(() => {
    const next = new URLSearchParams(window.location.search);
    if (!cleaned.current) {
      next.delete("saved");
      cleaned.current = true;
    }
    if (open) next.set("doc", open);
    else next.delete("doc");
    const qs = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [open]);

  const done = (text: string, undo?: () => void) => setToast((t) => ({ text, undo, key: (t?.key ?? 0) + 1 }));
  const openItem = items.find((i) => refKey(i) === open);
  const queue = toCheck(v);
  const missing = missingDocs(v);
  const asked = awaitingReupload(v);
  const first = firstName(v.name);
  const place = placeLine(v);
  const cars = `${v.cars.length} car${v.cars.length === 1 ? "" : "s"}`;
  const photo = findDoc(v.docs, "photo");
  const photoUrl = photo?.file && !photo.file.endsWith(".pdf") ? docUrl(photo.file) : null;

  // ---- Header line ----
  const statusDay = v.statusAt ? (v.statusAt.slice(0, 10) === today ? "today" : dayMonth(v.statusAt)) : "";
  const sub =
    v.status === "pending"
      ? [v.source === "driver-app" ? `Signed up ${fullDate(v.createdAt)} in the driver app` : `Added ${fullDate(v.createdAt)} by staff`, cars, place]
      : v.status === "approved"
        ? [`Approved ${statusDay || dayMonth(v.approvedAt ?? v.createdAt)}`, cars, place]
        : v.status === "suspended"
          ? [v.suspendedUntil ? `Suspended till ${weekdayDate(v.suspendedUntil)}` : "Suspended until reactivated", cars, place]
          : [`Rejected ${statusDay || dayMonth(v.createdAt)}`, v.statusAt ? `can apply again from ${dayMonth(addDays(v.statusAt.slice(0, 10), 30))}` : ""];

  // ---- Banner ----
  let banner: React.ReactNode = null;
  if (v.status === "pending") {
    if (asked.length) {
      const a = asked[0];
      const what = a.car ? docPhrase(a) : a.ref.kind === "photo" ? "profile photo" : `${DOC_LABELS[a.ref.kind].replace(/ card$/, "")} photo`;
      banner = (
        <Notice title={`Waiting for a new ${what}${asked.length > 1 ? ` and ${asked.length - 1} more` : ""}`}>
          {first} was asked on WhatsApp. The vendor stays Pending until it is uploaded and checked.
        </Notice>
      );
    } else if (queue.length + missing.length > 0) {
      const n = queue.length + missing.length;
      const reviewText = queue.length ? `${joinWords(queue.map((i) => docPhrase(i)))} ${queue.length > 1 ? "need" : "needs"} review.` : "";
      const missingText = missing.length ? `${joinWords(missing.map((i) => docPhrase(i)))} ${missing.length > 1 ? "are" : "is"} missing.` : "";
      const s = [reviewText, missingText].filter(Boolean).join(" ");
      banner = <Notice title={`Check ${n} document${n > 1 ? "s" : ""} before approving`}>{s.charAt(0).toUpperCase() + s.slice(1)}</Notice>;
    } else {
      banner = <Notice title="Ready to approve">All documents checked.</Notice>;
    }
    if (!asked.length && !queue.length && missing.length && missing.every((m) => m.car)) {
      const s = `${joinWords(missing.map((i) => docPhrase(i)))} ${missing.length > 1 ? "are" : "is"} still missing, so that car stays off trips.`;
      banner = <Notice title="Ready to approve">All documents checked. {s.charAt(0).toUpperCase() + s.slice(1)}</Notice>;
    }
  } else if (v.status === "approved") {
    const off = v.cars.filter((c) => !carReady(c, today));
    const ready = v.cars.filter((c) => carReady(c, today));
    if (off.length) {
      const bad = off.flatMap((c) =>
        CAR_DOCS.map((k) => ({ k, c, b: docBadge(findDoc(c.docs, k), today) })).filter((x) => x.b !== "verified" && x.b !== "expiring"),
      );
      const words = bad.map((x) => docPhrase({ ref: { kind: x.k, carId: x.c.id }, car: x.c }).replace(/^the /, ""));
      const verb = bad.every((x) => x.b === "missing" || x.b === "expired") ? "Upload" : bad.every((x) => x.b === "review") ? "Check" : "Upload or check";
      banner = (
        <Notice title={off.length === 1 ? `${off[0].model} is off trips` : `${off.length} cars are off trips`}>
          {`${verb} the ${joinWords(words)} to put ${off.length === 1 ? "it" : "them"} on trips.`}
          {ready.length ? ` ${joinWords(ready.map((c) => c.model))} ${ready.length > 1 ? "are" : "is"} ready.` : ""}
        </Notice>
      );
    }
  } else if (v.status === "suspended") {
    const days = v.suspendedUntil && v.statusAt ? Math.round((Date.parse(`${v.suspendedUntil}T00:00:00Z`) - Date.parse(`${v.statusAt.slice(0, 10)}T00:00:00Z`)) / 864e5) : 0;
    banner = (
      <ArtBanner art="vendor-paused" title={days ? `Off trips for ${days} days` : "Off trips until reactivated"}>
        Reason: {(v.statusReason ?? "not given").toLowerCase()}.{v.statusAt ? ` Suspended ${dayMonth(v.statusAt)}${v.statusBy ? ` by ${v.statusBy}` : ""}.` : ""}
        {suspendNote ? ` ${suspendNote}` : ""}
      </ArtBanner>
    );
  } else if (v.status === "rejected") {
    const msg = (v.statusMessage ?? "").replace(/^Namaste [^,]+,\s*/i, "");
    const reason = v.statusReason ?? "";
    banner = (
      <ArtBanner art="documents" title={`Rejected${reason ? `: ${reason.charAt(0).toLowerCase()}${reason.slice(1)}` : ""}`}>
        {msg ? `Sent on WhatsApp: “${msg.charAt(0).toUpperCase()}${msg.slice(1)}”` : "No message was sent."}
      </ArtBanner>
    );
  }

  // ---- Header buttons ----
  const edit = (
    <Link href={`/admin/vendors/${v.id}/edit`} className={btnGhost}>
      <Icon name="pencil-simple" size={16} />
      Edit
    </Link>
  );
  const actions =
    v.status === "pending" ? (
      <>
        {edit}
        <button type="button" className={btnDanger} onClick={() => setDialog("reject")}>
          Reject
        </button>
        <button
          type="button"
          className={btnPrimary}
          onClick={() => setDialog("approve")}
          disabled={approvalBlocked(v)}
          title={approvalBlocked(v) ? "Profile photo, Aadhaar and driving licence must be uploaded first" : undefined}
        >
          <Icon name="check" size={16} />
          Approve vendor
        </button>
      </>
    ) : v.status === "approved" ? (
      <>
        {edit}
        <button type="button" className={btnGhost} onClick={() => setDialog("suspend")}>
          Suspend
        </button>
        <Link href="/admin/bookings?status=new" className={btnPrimary}>
          <Icon name="plus" size={16} />
          Assign a booking
        </Link>
      </>
    ) : v.status === "suspended" ? (
      <>
        {edit}
        <button
          type="button"
          className={btnPrimary}
          onClick={() =>
            start(async () => {
              const res = await reactivateVendor(v.id);
              if (!res.error) done(`${v.name} is back on trips`, () => void undoVendorChange(v.id));
            })
          }
        >
          <Icon name="check" size={16} />
          Reactivate vendor
        </button>
      </>
    ) : (
      <Link href="/admin/vendors" className={btnGhost}>
        Back to vendors
      </Link>
    );

  // ---- Documents grouped: person, then one group per car ----
  const groups = [
    { title: "Person", items: items.filter((i) => !i.car && (i.doc.file || i.ref.kind !== "pan" || i.doc.status !== "missing")) },
    ...v.cars.map((c) => ({ title: `${c.model} · ${c.number}`, items: items.filter((i) => i.car?.id === c.id) })),
  ];

  const trips = v.trips ?? 0;
  const activityNote =
    v.status === "pending"
      ? "Trips and earnings start once the vendor is approved."
      : v.status === "rejected"
        ? "No trips taken. The record is kept for 30 days."
        : trips
          ? `Approved ${dayMonth(v.approvedAt ?? v.createdAt)}. ${trips} trip${trips > 1 ? "s" : ""} so far.`
          : `Approved ${dayMonth(v.approvedAt ?? v.createdAt)}${v.statusBy ? ` by ${v.statusBy}` : ""}. Trips and earnings show here after the first ride.`;

  const addr = v.address;
  const addressText = addr ? [addr.line, addr.town, addr.district, [addr.state, addr.pin].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "";
  const mapsHref =
    addr?.lat != null && addr.lng != null
      ? `https://www.google.com/maps?q=${addr.lat},${addr.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText || place)}`;
  const pan = v.pan || findDoc(v.docs, "pan")?.number;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/vendors" className="inline-flex w-fit items-center gap-1.5 type-ui text-link hover:text-link-hover">
        <Icon name="arrow-left" size={16} />
        Vendors
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-gray-100 bg-layer text-[var(--icon-primary)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-checked photo */}
          {photoUrl ? <img src={photoUrl} alt="" className="size-full object-cover" /> : <Icon name="user" size={28} />}
        </span>
        <div className="min-w-[min(100%,18rem)] flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="type-h1 text-primary">{v.name}</h1>
            <KindTag kind={v.kind} />
            <VendorStatusBadge status={v.status} />
          </div>
          <p className="mt-1 type-body-md text-secondary">{sub.filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">{actions}</div>
      </div>

      {banner}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card
            title={`Cars (${v.cars.length})`}
            action={
              v.status !== "rejected" && (
                <Link href={`/admin/vendors/${v.id}/edit?addCar=1#cars`} className={`${btnText} px-5 py-2.5`}>
                  <Icon name="plus" size={16} />
                  Add car
                </Link>
              )
            }
          >
            {v.cars.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {v.cars.map((c) => (
                  <div key={c.id} className="flex flex-col gap-3.5 rounded-lg border border-gray-100 bg-layer p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-md bg-gray-50 text-[var(--icon-primary)]">
                        <Icon name="car-simple-24" size={24} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate type-ui text-primary">{c.model}</p>
                        <p className="truncate type-body-sm text-secondary">{[c.type, c.fuel, c.seats ? `${c.seats} seats` : "", c.year || ""].filter(Boolean).join(" · ")}</p>
                      </div>
                    </div>
                    <span>
                      <NumberPlate number={c.number} />
                    </span>
                    <p className="flex gap-1.5 type-body-sm text-secondary">
                      <Icon name="file-text-16" size={16} className="mt-0.5 text-[var(--icon-secondary)]" />
                      {carDocLine(c, v, today)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="type-body-sm text-secondary">No cars yet{v.kind === "driver" ? " — this driver drives cars given to them." : "."}</p>
            )}
          </Card>

          <Card title="Documents">
            <div className="flex flex-col gap-3.5">
              {groups.map((g) => (
                <div key={g.title}>
                  <p className="type-body-sm text-secondary">{g.title}</p>
                  {g.items.map((i) => {
                    const badge = docBadge(i.doc, today);
                    return (
                      <div key={refKey(i)} className="flex items-center gap-3 border-b border-gray-100 py-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-gray-50 text-[var(--icon-primary)]">
                          <Icon name="file-text" size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="type-ui text-primary">{i.label}</p>
                          <p className="truncate type-body-sm text-secondary">{docDetail(i, v, today)}</p>
                        </div>
                        <span className="hidden sm:inline-flex">
                          <DocTag badge={badge} />
                        </span>
                        {badge === "missing" ? (
                          v.status !== "rejected" ? (
                            <UploadButton vendorId={v.id} item={i} onDone={done} />
                          ) : null
                        ) : (
                          <button type="button" onClick={() => setOpen(refKey(i))} className={`${btnText} px-5 py-2.5`}>
                            View
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Contact">
            <InfoRow icon="phone" label="Mobile">
              <p className="type-body-md text-primary">{v.mobile}</p>
              {v.whatsapp !== false && <p className="type-body-sm text-secondary">Also on WhatsApp</p>}
              {v.altMobile && <p className="type-body-sm text-secondary">Alternate {v.altMobile}</p>}
            </InfoRow>
            {v.email && (
              <InfoRow icon="envelope-simple" label="Email">
                <p className="break-all type-body-md text-primary">{v.email}</p>
              </InfoRow>
            )}
            <div className="flex flex-wrap gap-2">
              <a href={telHref(v.mobile)} className={btnGhost}>
                <Icon name="phone" size={16} />
                Call
              </a>
              <a href={vendorWa(v.mobile, `Namaste ${first} ji, `)} target="_blank" rel="noreferrer" className={btnGhost}>
                <Icon name="whatsapp-logo" size={16} />
                WhatsApp
              </a>
            </div>
          </Card>

          <Card title="Location">
            <InfoRow icon="map-pin" label="Address">
              <p className="type-body-md text-primary">{addressText || "Not added yet"}</p>
            </InfoRow>
            <div>
              <p className="type-body-sm text-secondary">Works around{v.radiusKm ? ` · within ${v.radiusKm} km` : v.radiusKm === null ? " · any distance" : ""}</p>
              {v.places.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {v.places.map((p) => (
                    <span key={p.name} className="rounded-full border border-gray-100 bg-gray-50 px-[11px] py-[5px] type-body-sm text-primary">
                      {p.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="type-body-sm text-primary">No places added</p>
              )}
            </div>
            {(addressText || place) && (
              <a href={mapsHref} target="_blank" rel="noreferrer" className={btnText}>
                Open in Google Maps
                <Icon name="arrow-right" size={16} />
              </a>
            )}
          </Card>

          <Card title="Payout">
            <InfoRow icon="currency-inr" label="UPI ID">
              <p className="break-all type-body-md text-primary">{v.upi || "Not added yet"}</p>
              {v.upi && <p className="type-body-sm text-secondary">Payouts every Monday</p>}
            </InfoRow>
            <InfoRow icon="identification-card" label="PAN">
              <p className="type-body-md text-primary">{pan ? maskPan(pan) : "Not added"}</p>
            </InfoRow>
          </Card>

          <Card title="Activity">
            <dl className="grid grid-cols-3 gap-3">
              {[
                { k: "Trips", val: String(trips) },
                { k: "Rating", val: v.rating ? v.rating.toFixed(1) : "None yet" },
                { k: "Earned", val: inr(v.earned ?? 0) },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="type-body-sm text-secondary">{s.k}</dt>
                  <dd className="type-h4 tabular-nums text-primary">{s.val}</dd>
                </div>
              ))}
            </dl>
            <p className="type-body-sm text-secondary">{activityNote}</p>
          </Card>
        </div>
      </div>

      {openItem && (
        <DocReviewDrawer
          key={open}
          vendor={v}
          item={openItem}
          queue={queue}
          today={today}
          onClose={() => setOpen(null)}
          onOpen={(i) => setOpen(refKey(i))}
          onDone={(text) => done(text)}
        />
      )}
      {dialog === "approve" && <ApproveDialog vendor={v} today={today} onClose={() => setDialog(null)} onDone={done} />}
      {dialog === "reject" && <RejectDialog vendor={v} onClose={() => setDialog(null)} onDone={done} />}
      {dialog === "suspend" && <SuspendDialog vendor={v} upcoming={upcoming} today={today} onClose={() => setDialog(null)} onDone={done} />}
      <VendorToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
