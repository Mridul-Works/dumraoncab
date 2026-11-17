import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UploadBox, UploadFailedNotice, UploadGroup } from "@/components/driver/camera";
import { ProgressSteps } from "@/components/driver/fields";
import { Body, CheckLine, LinkBtn, Screen, Spacer, TopBar, btnClass } from "@/components/driver/ui";
import { uploadDoc } from "@/app/driver/actions";
import { requireJoining } from "../join";

export const metadata: Metadata = { title: "Your documents" };

const DOCS = [
  { kind: "aadhaar", label: "Aadhaar card", hint: "Front and back · 2 photos", camera: { title: "Aadhaar card · front", guide: "Fit the card inside the box. Keep away from glare.", sides: 2, pdf: true, page: "Your documents", check: true } },
  { kind: "licence", label: "Driving licence", hint: "Front and back · 2 photos", camera: { title: "Driving licence · front", guide: "Fit the licence inside the box. Keep away from glare.", sides: 2, pdf: true, page: "Your documents", check: true } },
] as const;

// Figma 10.7 Your documents — each box opens the camera (10.8); camera off
// (10.9); a photo that didn't upload shows the notice and Try again (10.10).
export default async function DocumentsPage() {
  const { draft } = await requireJoining();
  if (!draft.name) redirect("/driver/join/details");
  const own = draft.carChoice === "own";
  const next = own ? "/driver/join/cars" : "/driver/join/review";
  const nextLabel = own ? "Next: your car" : "Next: check and submit";
  const ready = DOCS.every((d) => draft.docs.some((x) => x.kind === d.kind && x.file));
  return (
    <Screen>
      <Body>
        <TopBar title="Your documents" back="/driver/join/details" />
        <ProgressSteps at={2} label={nextLabel} />
        <p className="type-ui text-secondary">Take a clear photo of each one. All four corners should show.</p>
        <UploadGroup>
          <UploadFailedNotice />
          {DOCS.map((d) => {
            const saved = draft.docs.find((x) => x.kind === d.kind && x.file);
            return (
              <UploadBox
                key={d.kind}
                label={d.label}
                hint={d.hint}
                done={!!saved}
                doneHint={saved ? "Added · the office checks it" : undefined}
                camera={{ ...d.camera }}
                action={uploadDoc}
                fields={{ kind: d.kind }}
              />
            );
          })}
        </UploadGroup>
        <CheckLine>Only the office sees these</CheckLine>
        <Spacer />
        {ready ? (
          <LinkBtn href={next}>{own ? "Next: your car" : "Next: review"}</LinkBtn>
        ) : (
          <button type="button" disabled className={btnClass("primary")}>
            {own ? "Next: your car" : "Next: review"}
          </button>
        )}
      </Body>
    </Screen>
  );
}
