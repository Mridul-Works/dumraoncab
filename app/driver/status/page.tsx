import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CameraButton, UploadBox } from "@/components/driver/camera";
import { allDocs, clockOf, fmtShort, dayOf, shortModel, type DocRef } from "@/components/driver/format";
import { Art, Body, btnClass, CheckLine, LinkBtn, Notice, Screen, Spacer, Tag, TopBar } from "@/components/driver/ui";
import { uploadDoc, signOut } from "@/app/driver/actions";
import { officeContact, requireVendor } from "@/lib/driverTrips";
import { DOC_LABELS } from "@/lib/vendorTypes";

export const metadata: Metadata = { title: "Waiting for checking" };

const PAPER: Record<string, string> = { rc: "RC", insurance: "insurance", permit: "permit", puc: "PUC" };
const personName = (k: string) => (k === "aadhaar" ? "Aadhaar" : k === "licence" ? "Driving licence" : DOC_LABELS[k as keyof typeof DOC_LABELS]);

// "Ertiga RC, permit, PUC" / "Aadhaar, Scorpio N RC"
function groupName(refs: DocRef[]) {
  const parts: string[] = [];
  for (const r of refs.filter((x) => !x.car)) parts.push(personName(r.doc.kind));
  const cars = new Map<string, DocRef[]>();
  for (const r of refs.filter((x) => x.car)) cars.set(r.car!.id, [...(cars.get(r.car!.id) ?? []), r]);
  for (const list of cars.values()) parts.push(`${shortModel(list[0].car!.model)} ${list.map((r) => PAPER[r.doc.kind]).join(", ")}`);
  return parts.join(", ");
}

const sentAt = (iso: string) => {
  const d = new Date(Date.parse(iso) + 5.5 * 3600000);
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
  return `${day} ${fmtShort(dayOf(iso))}, ${clockOf(iso)}`;
};

// Figma 10.12 Waiting for checking · 10.13 Asked to re-upload · rejected.
export default async function StatusPage() {
  const { vendor } = await requireVendor();
  if (vendor.status === "approved" || vendor.status === "suspended") redirect("/driver");
  const office = await officeContact();
  const refs = allDocs(vendor);

  if (vendor.status === "rejected")
    return (
      <Screen>
        <Body className="gap-[16px] pt-[24px] pb-[20px]">
          <Art name="paused-illustration" />
          <h1 className="type-h2 text-primary">Not approved</h1>
          <p className="type-body-md text-secondary">{vendor.statusReason ? `The office could not approve you: ${vendor.statusReason}` : "The office could not approve you this time."} Call the office to talk about it.</p>
          <Spacer />
          <LinkBtn href={office.tel} icon="phone">
            Call the office
          </LinkBtn>
          <form action={signOut}>
            <button type="submit" className={btnClass("ghost")}>
              Sign out
            </button>
          </form>
        </Body>
      </Screen>
    );

  // 10.13: the office asked for one document again.
  const fix = refs.find((r) => r.doc.status === "reupload");
  if (fix) {
    const fine = groupName(refs.filter((r) => r.doc.status === "verified" || r.doc.status === "review"));
    return (
      <Screen>
        <Body>
          <TopBar title="Fix a document" />
          <Notice title={`From the office${vendor.updatedAt ? ` · ${fmtShort(dayOf(vendor.updatedAt))}, ${clockOf(vendor.updatedAt)}` : ""}`}>
            {fix.doc.reason || `Your ${fix.car ? `${shortModel(fix.car.model)} ${PAPER[fix.doc.kind]}` : personName(fix.doc.kind)} photo is not clear. Please take it again.`}
          </Notice>
          <UploadBox
            label={fix.car ? `${shortModel(fix.car.model)} ${fix.label}` : fix.label}
            hint={fix.doc.kind === "aadhaar" || fix.doc.kind === "licence" ? "Front and back, all four corners" : "All four corners should show"}
            camera={{ title: `${fix.label} · front`, guide: "Fit it inside the box. Keep away from glare.", sides: fix.doc.kind === "aadhaar" || fix.doc.kind === "licence" ? 2 : 1, pdf: true }}
            action={uploadDoc}
            fields={{ kind: fix.doc.kind, ...(fix.car ? { car: fix.car.id } : {}) }}
          />
          {fine && <CheckLine>{`${fine} ${fine.includes(",") || fine.includes(" and ") ? "are" : "is"} fine`}</CheckLine>}
          <Spacer />
          <button type="button" disabled className={btnClass("primary")}>
            Send again
          </button>
          <p className="-mt-[6px] text-center type-body-sm text-secondary">It sends as soon as the new photo is taken.</p>
        </Body>
      </Screen>
    );
  }

  const verified = refs.filter((r) => r.doc.status === "verified");
  const checking = refs.filter((r) => r.doc.status === "review");
  const missing = refs.filter((r) => r.doc.status === "missing");

  return (
    <Screen>
      <Body className="gap-[16px] pt-[24px] pb-[20px]">
        <Art name="waiting-illustration" />
        <h1 className="type-h2 text-primary">Waiting for checking</h1>
        <p className="type-body-md text-secondary">Sent {sentAt(vendor.createdAt)}. The office checks within a day and sends an SMS. Signing in again brings you here.</p>
        <div className="flex w-full flex-col rounded-lg border border-gray-100 bg-layer px-[18px] py-[8px]">
          {verified.length > 0 && (
            <div className="flex items-center gap-[10px] py-[10px]">
              <span className="min-w-0 flex-1 type-ui text-primary">{groupName(verified)}</span>
              <Tag>Verified</Tag>
            </div>
          )}
          {checking.length > 0 && (
            <div className={`flex items-center gap-[10px] py-[10px] ${verified.length ? "border-t border-gray-100" : ""}`}>
              <span className="min-w-0 flex-1 type-ui text-primary">{groupName(checking)}</span>
              <Tag tone="amber">Being checked</Tag>
            </div>
          )}
          {missing.map((r, i) => (
            <div key={`${r.car?.id ?? "me"}-${r.doc.kind}`} className={`flex items-center gap-[10px] py-[10px] ${verified.length || checking.length || i ? "border-t border-gray-100" : ""}`}>
              <span className="min-w-0 flex-1 type-ui text-primary">{r.car ? `${shortModel(r.car.model)} ${PAPER[r.doc.kind]}` : r.label}</span>
              <CameraButton
                action={uploadDoc}
                fields={{ kind: r.doc.kind, ...(r.car ? { car: r.car.id } : {}) }}
                title={r.car ? `${r.label} · ${r.car.number}` : r.label}
                guide="Fit the paper inside the box. All four corners should show."
                className={btnClass("secondary", false)}
              >
                Upload
              </CameraButton>
            </div>
          ))}
        </div>
        <Spacer />
        <LinkBtn href={office.tel} variant="secondary" icon="phone">
          Call the office
        </LinkBtn>
      </Body>
    </Screen>
  );
}
