import type { Metadata } from "next";
import { QuickSettings } from "@/components/driver/Settings";
import { Body, Screen } from "@/components/driver/ui";
import { requireVendor } from "@/lib/driverTrips";

export const metadata: Metadata = { title: "Two quick settings" };

// Figma 10.15 Two quick settings — after approval, before Today.
export default async function SettingsPage() {
  await requireVendor();
  return (
    <Screen>
      <Body className="gap-[24px] pt-[40px] pb-[24px]">
        <div className="flex flex-col gap-[8px]">
          <h1 className="type-h2 text-primary">Two quick settings</h1>
          <p className="type-ui text-secondary">So you never miss a trip, and the customer can see you coming.</p>
        </div>
        <QuickSettings />
      </Body>
    </Screen>
  );
}
