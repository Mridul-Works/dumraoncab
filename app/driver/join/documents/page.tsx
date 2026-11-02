import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UploadBox } from "@/components/driver/camera";
import { Body, CheckLine, LinkBtn, Screen, Spacer, Steps, TopBar } from "@/components/driver/ui";
import { uploadDoc } from "@/app/driver/actions";
import { requireJoining } from "../join";

export const metadata: Metadata = { title: "Your documents" };

const DOCS = [
  { kind: "aadhaar", label: "Aadhaar card", hint: "Front and back · 2 photos", camera: { title: "Aadhaar card · front", guide: "Fit the card inside the box. Keep away from glare.", sides: 2, pdf: true } },
  { kind: "licence", label: "Driving licence", hint: "Front and back · 2 photos", camera: { title: "Driving licence · front", guide: "Fit the licence inside the box. Keep away from glare.", sides: 2, pdf: true } },
] as const;

// Figma 10.6 Your documents — each box opens the camera (10.7 / 10.8).
export default async function DocumentsPage() {
  const { draft } = await requireJoining();
  if (!draft.name) redirect("/driver/join/details");
  const next = draft.carChoice === "own" ? "/driver/join/cars" : "/driver/join/review";
  const ready = DOCS.every((d) => draft.docs.some((x) => x.kind === d.kind && x.file));
  return (
    <Screen>
      <Body>
        <TopBar title="Your documents" back="/driver/join/details" />
        <Steps at={2} />
        <p className="type-body-sm text-secondary">Take a clear photo of each one. All four corners should show.</p>
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
        <CheckLine>Only the office sees these</CheckLine>
        <Spacer />
        {ready ? (
          <LinkBtn href={next}>{draft.carChoice === "own" ? "Next: your car" : "Next: review"}</LinkBtn>
        ) : (
          <button type="button" disabled className="inline-flex h-[48px] w-full items-center justify-center rounded-full bg-button-primary px-[20px] type-ui text-on-color opacity-40">
            {draft.carChoice === "own" ? "Next: your car" : "Next: review"}
          </button>
        )}
      </Body>
    </Screen>
  );
}
