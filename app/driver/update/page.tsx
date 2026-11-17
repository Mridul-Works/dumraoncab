import type { Metadata } from "next";
import { UpdateNowButton } from "@/components/driver/AppStates";
import { Art, Body, Mark, Screen, Spacer } from "@/components/driver/ui";
import { officeContact } from "@/lib/driverTrips";

export const metadata: Metadata = { title: "Update the app" };

// Figma 10.54 Update the app — shown when this copy of the app is too old to
// take trips. "Update now" loads the newest version; nothing is lost.
export default async function UpdatePage() {
  const office = await officeContact();
  return (
    <Screen tone="white">
      <Body className="gap-[20px] pt-[40px] pb-[20px]">
        <div className="flex items-center gap-[12px]">
          <Mark />
          <div className="flex flex-col">
            <span className="type-ui text-primary">Dumraon Cab</span>
            <span className="type-body-sm text-secondary">Driver</span>
          </div>
        </div>
        <Art name="update-illustration" width={288} height={192} />
        <h1 className="type-h2 text-primary">Update the app</h1>
        <p className="type-body-md text-secondary">This version is too old to take trips. Updating takes about a minute and keeps you signed in.</p>
        <Spacer />
        <UpdateNowButton />
        <p className="text-center type-body-sm text-secondary">{`Finished trips are safe. If the update fails, call the office on ${office.display}.`}</p>
      </Body>
    </Screen>
  );
}
