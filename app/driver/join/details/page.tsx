import type { Metadata } from "next";
import Icon from "@/components/admin/Icon";
import { CameraButton } from "@/components/driver/camera";
import { DetailsForm } from "@/components/driver/JoinForms";
import { initials } from "@/components/driver/format";
import { Body, Screen, Steps, TopBar } from "@/components/driver/ui";
import { uploadDoc } from "@/app/driver/actions";
import { requireJoining } from "../join";

export const metadata: Metadata = { title: "Your details" };

// Figma 10.5 Your details — first time only.
export default async function DetailsPage() {
  const { draft } = await requireJoining();
  return (
    <Screen>
      <Body>
        <TopBar title="Your details" back="/driver/welcome" />
        <Steps at={1} />
        <div className="flex items-center gap-[14px]">
          <span className="grid size-[56px] shrink-0 place-items-center rounded-full bg-brand type-h4 text-inverse">{initials(draft.name || "")}</span>
          <div className="flex min-w-0 flex-col">
            <span className="type-ui text-primary">Your photo</span>
            <span className="type-body-sm text-secondary">{draft.photo ? "Added · customers see it with your name" : "Customers see it with your name"}</span>
            <CameraButton
              action={uploadDoc}
              fields={{ kind: "photo" }}
              title="Your photo"
              guide="Face the camera in good light. No cap or sunglasses."
              className="flex min-h-[32px] items-center gap-[4px] self-start type-ui text-brand"
            >
              <Icon name="camera" size={16} />
              {draft.photo ? "Change" : "Add photo"}
            </CameraButton>
          </div>
        </div>
        <DetailsForm draft={draft} />
      </Body>
    </Screen>
  );
}
