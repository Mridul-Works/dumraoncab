import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SubmitForm } from "@/components/driver/JoinForms";
import { shortModel } from "@/components/driver/format";
import { Body, Divider, Screen, SummaryRow, TopBar } from "@/components/driver/ui";
import { CAR_DOCS } from "@/lib/vendorTypes";
import { requireJoining } from "../join";

export const metadata: Metadata = { title: "Check and submit" };

const PAPER = { rc: "RC", insurance: "insurance", permit: "permit", puc: "PUC" } as const;

// Figma 10.11 Check and submit — last look before the office sees it.
export default async function ReviewPage() {
  const { draft } = await requireJoining();
  if (!draft.name) redirect("/driver/join/details");
  const own = draft.carChoice === "own";
  const cars = draft.cars.filter((c) => c.model);
  const personAdded = (["aadhaar", "licence"] as const).filter((k) => draft.docs.some((d) => d.kind === k && d.file));
  const later = cars.flatMap((c) => CAR_DOCS.filter((k) => !c.docs.some((d) => d.kind === k && d.file)).map((k) => `${shortModel(c.model)} ${PAPER[k]}`));

  return (
    <Screen>
      <Body>
        <TopBar title="Check and submit" back={own ? "/driver/join/cars" : "/driver/join/documents"} />
        <p className="type-ui text-secondary">The office checks these within a day. Tap a row to change it.</p>
        <div className="flex flex-col overflow-hidden rounded-md border border-gray-200 bg-layer">
          <SummaryRow label="You" value={draft.name} detail={`${draft.place} · UPI ${draft.upi}`} edit="/driver/join/details" />
          <Divider />
          <SummaryRow
            label="Papers"
            value={personAdded.length ? personAdded.map((k) => (k === "aadhaar" ? "Aadhaar card" : "driving licence")).join(", ").replace(/^./, (c) => c.toUpperCase()) : "Not added yet"}
            detail={`${personAdded.length} of 2 added`}
            edit="/driver/join/documents"
          />
          <Divider />
          <SummaryRow
            label="Cars"
            value={own ? cars.map((c) => shortModel(c.model)).join(", ") || "Not added yet" : "A Dumraon Cab car"}
            detail={own ? (later.length ? `${later.join(", ")} can come later` : "All papers added") : "The office gives you one after checking"}
            edit={own ? "/driver/join/cars" : "/driver/join/details"}
          />
        </div>
        <SubmitForm />
      </Body>
    </Screen>
  );
}
