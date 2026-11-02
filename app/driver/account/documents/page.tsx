import type { Metadata } from "next";
import Icon from "@/components/admin/Icon";
import { CameraButton } from "@/components/driver/camera";
import { allDocs, daysUntil, docDetail, docShort, expiresSoon, isExpired, shortModel, type DocRef } from "@/components/driver/format";
import { Banner, Body, btnClass, Screen, Spacer, Tag, TopBar } from "@/components/driver/ui";
import { uploadDoc } from "@/app/driver/actions";
import { requireApproved } from "@/lib/driverTrips";

export const metadata: Metadata = { title: "My documents" };

function badge(r: DocRef) {
  const d = r.doc;
  if (d.status === "missing") return <Tag tone="red">Missing</Tag>;
  if (d.status === "reupload") return <Tag tone="red">Upload again</Tag>;
  if (d.status === "review") return <Tag tone="amber">Being checked</Tag>;
  if (isExpired(d)) return <Tag tone="red" icon="warning-circle">Expired</Tag>;
  if (expiresSoon(d)) return <Tag tone="amber" icon="warning-circle">Expires soon</Tag>;
  return <Tag icon="check-circle">Verified</Tag>;
}

const needsUpload = (r: DocRef) => r.doc.status === "missing" || r.doc.status === "reupload" || (r.doc.status !== "review" && (isExpired(r.doc) || expiresSoon(r.doc)));
const name = (r: DocRef) => (r.car ? `${shortModel(r.car.model)} ${docShort(r.doc.kind)}` : docShort(r.doc.kind));
const fields = (r: DocRef): Record<string, string> => ({ kind: r.doc.kind, ...(r.car ? { car: r.car.id } : {}) });

// Figma 10.46 My documents — same rows as the admin (6.6). Upload opens the camera (10.7).
export default async function MyDocumentsPage() {
  const { vendor } = await requireApproved();
  const refs = allDocs(vendor, true).filter((r) => !(r.doc.kind === "pan" && r.doc.status === "missing"));
  // Most urgent first: expired, then soonest expiry, then missing / re-upload.
  const todo = refs
    .filter(needsUpload)
    .sort((a, b) => (a.doc.validTill ?? "9999").localeCompare(b.doc.validTill ?? "9999"));
  const first = todo[0];
  const multiCar = vendor.cars.length > 1;

  return (
    <Screen>
      <Body>
        <TopBar title="My documents" back="/driver/account" />
        {first?.doc.validTill && (isExpired(first.doc) || expiresSoon(first.doc)) && (
          <Banner>
            {isExpired(first.doc)
              ? `${name(first)} expired. Upload the new one so trips can start again.`
              : `${name(first)} expires in ${daysUntil(first.doc.validTill)} ${daysUntil(first.doc.validTill) === 1 ? "day" : "days"}. Upload the new one so trips don’t pause.`}
          </Banner>
        )}
        <div className="flex flex-col rounded-lg border border-gray-100 bg-layer px-[6px] py-[6px]">
          {refs.map((r, i) => (
            <div key={`${r.car?.id ?? "me"}-${r.doc.kind}`} className={`flex items-center gap-[12px] px-[6px] py-[12px] ${i ? "border-t border-gray-100" : ""}`}>
              <span className="grid size-[40px] shrink-0 place-items-center rounded-md bg-gray-50 text-secondary">
                <Icon name="file-text" size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="type-ui text-primary">{r.car && multiCar ? `${shortModel(r.car.model)} ${r.label}` : r.label}</span>
                <span className="truncate type-body-sm text-secondary">{docDetail(r)}</span>
              </span>
              {needsUpload(r) && r !== first ? (
                <CameraButton action={uploadDoc} fields={fields(r)} title={r.label} guide="Fit it inside the box. All four corners should show." className="shrink-0">
                  {badge(r)}
                </CameraButton>
              ) : (
                badge(r)
              )}
            </div>
          ))}
        </div>
        <Spacer />
        {first && (
          <CameraButton action={uploadDoc} fields={fields(first)} title={first.label} guide="Fit it inside the box. All four corners should show." className={btnClass("primary")}>
            <Icon name="upload-simple" size={16} />
            {`Upload new ${name(first)}`}
          </CameraButton>
        )}
      </Body>
    </Screen>
  );
}
