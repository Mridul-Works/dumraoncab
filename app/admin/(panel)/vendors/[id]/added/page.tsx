import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { btnGhost, btnPrimary, btnText } from "@/components/admin/ui";
import { allDocs, clock, docPhrase, firstName, missingDocs, telHref, toCheck, type DocItem } from "@/components/admin/vendors/format";
import { Art, DocTag, VendorStatusBadge } from "@/components/admin/vendors/parts";
import { requireAdmin } from "@/lib/adminAuth";
import { istDate } from "@/lib/bookingTypes";
import { CAR_DOCS, REQUIRED_PERSON_DOCS, docBadge, getVendor } from "@/lib/vendors";

export const metadata: Metadata = { title: "Vendor added" };

type Props = { params: Promise<{ id: string }> };

const refKey = (i: DocItem) => (i.ref.carId ? `${i.ref.kind}:${i.ref.carId}` : i.ref.kind);

function Fact({ icon, label, title, line }: { icon: string; label: string; title: string; line: string }) {
  return (
    <div className="flex min-w-0 gap-3">
      <Icon name={icon} size={18} className="mt-0.5 shrink-0 text-[var(--icon-primary)]" />
      <div className="min-w-0">
        <p className="type-body-sm text-secondary">{label}</p>
        <p className="truncate type-body-md text-primary">{title}</p>
        <p className="truncate type-body-sm text-secondary">{line}</p>
      </div>
    </div>
  );
}

// Figma 6.5 Vendor added — shown right after "Save vendor".
export default async function VendorAddedPage({ params }: Props) {
  await requireAdmin();
  const v = await getVendor((await params).id);
  if (!v) notFound();
  const today = istDate();
  const first = firstName(v.name);
  const welcome = v.history?.find((e) => e.text === "Welcome note opened on WhatsApp");

  const total = REQUIRED_PERSON_DOCS.length + v.cars.length * CAR_DOCS.length;
  const have = allDocs(v).filter((i) => i.ref.kind !== "pan" && docBadge(i.doc, today) !== "missing").length;
  const review = toCheck(v);
  const missingPerson = missingDocs(v).filter((i) => !i.car);
  const rows = [...review, ...missingPerson];
  const car = v.cars[0];
  const town = [v.address?.town, v.address?.state].filter(Boolean).join(", ");
  const otherPlaces = v.places.filter((p) => !p.home).length + (v.address?.town ? 1 : 0);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/vendors" className="inline-flex w-fit items-center gap-1.5 type-ui text-link hover:text-link-hover">
        <Icon name="arrow-left" size={16} />
        Vendors
      </Link>

      <div className="mx-auto flex w-full max-w-[540px] flex-col items-center gap-2 text-center">
        <Art name="vendors" />
        <h1 className="mt-3 type-h1 text-primary">Vendor added</h1>
        <p className="type-body-md text-secondary">
          {v.name} is in Pending. Check their documents to start trips.
        </p>
        {welcome && (
          <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-layer px-3.5 py-1.5 type-body-sm text-primary">
            <Icon name="whatsapp-logo" size={16} className="text-brand" />
            Welcome note sent on WhatsApp to {v.mobile}
            <span className="text-secondary">· {clock(welcome.at)}</span>
          </p>
        )}
      </div>

      <section className="mx-auto w-full max-w-[760px] overflow-hidden rounded-lg border border-gray-100 bg-layer shadow-[0_1px_2px_var(--shadow-sm)]">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-gray-100 px-5 py-4">
          <h2 className="type-h4 text-primary">{v.name}</h2>
          {v.code && <span className="type-mono-sm text-secondary">{v.code}</span>}
          <VendorStatusBadge status={v.status} />
          <Link href={`/admin/vendors/${v.id}`} className={`${btnText} ml-auto`}>
            Open vendor
          </Link>
        </div>
        <div className="flex flex-col gap-5 px-5 py-5">
          <div className="grid gap-4 border-b border-gray-100 pb-5 sm:grid-cols-3">
            <Fact icon="user" label={v.kind === "owner" ? "Owner" : "Driver"} title={v.name} line={v.mobile} />
            <Fact
              icon="car-simple-18"
              label={`${v.cars.length} car${v.cars.length === 1 ? "" : "s"}`}
              title={car ? car.model : "No car yet"}
              line={car ? [car.number, car.type, car.seats ? `${car.seats} seats` : ""].filter(Boolean).join(" · ") : "Can be added later"}
            />
            <Fact icon="map-pin" label="Location" title={town || "Not added"} line={`${otherPlaces} place${otherPlaces === 1 ? "" : "s"}${v.radiusKm ? ` within ${v.radiusKm} km` : ""}`} />
          </div>
          <div>
            <p className="type-ui text-primary">
              Documents · {have} of {total} <span className="type-body-sm text-secondary">Needed before the first trip</span>
            </p>
            {rows.length ? (
              rows.map((i) => {
                const badge = docBadge(i.doc, today);
                return (
                  <div key={refKey(i)} className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-b-0">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-gray-50 text-[var(--icon-primary)]">
                      <Icon name="file-text" size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="type-ui text-primary">{docPhrase(i, true)}</p>
                      <p className="truncate type-body-sm text-secondary">
                        {badge === "missing" ? `Ask ${first} to send it on WhatsApp` : `${i.doc.fileName ?? "Uploaded just now"} · check it`}
                      </p>
                    </div>
                    <DocTag badge={badge} />
                    {badge === "missing" ? (
                      <Link href={`/admin/vendors/${v.id}`} className={btnGhost}>
                        Upload
                      </Link>
                    ) : (
                      <Link href={`/admin/vendors/${v.id}?doc=${encodeURIComponent(refKey(i))}`} className={`${btnText} px-3`}>
                        View
                      </Link>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="mt-2 type-body-sm text-secondary">Every document is in. Approve the vendor from their page.</p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[760px] flex-wrap items-center gap-3">
        <Link href={review.length ? `/admin/vendors/${v.id}?doc=${encodeURIComponent(refKey(review[0]))}` : `/admin/vendors/${v.id}`} className={btnPrimary}>
          <Icon name="arrow-right" size={16} />
          Check documents
        </Link>
        <Link href="/admin/vendors/new" className={btnGhost}>
          <Icon name="plus" size={16} />
          Add another vendor
        </Link>
        <a href={telHref(v.mobile)} className={`${btnGhost} sm:ml-auto`}>
          <Icon name="phone" size={16} />
          Call {first}
        </a>
        <Link href="/admin/vendors" className={btnText}>
          Go to vendors
        </Link>
      </div>
    </div>
  );
}
