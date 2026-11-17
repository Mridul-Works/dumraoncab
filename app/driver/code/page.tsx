import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Body, Screen } from "@/components/driver/ui";
import { CodeForm } from "@/components/driver/SignIn";
import { SHOW_CODE_ON_SCREEN, getDriverSession, mobileDigits, resendWait, sendBlockedMinutes, showMobile } from "@/lib/driverAuth";
import { officeContact } from "@/lib/driverTrips";

export const metadata: Metadata = { title: "Enter the code" };

// Figma 10.3 Enter the code / 10.4 Wrong code / 10.5 Too many codes asked.
export default async function CodePage() {
  if (await getDriverSession()) redirect("/driver");
  const jar = await cookies();
  const mobile = mobileDigits(jar.get("dc_driver_m")?.value ?? "");
  if (!mobile) redirect("/driver/sign-in");
  // Development only: there is no SMS provider, so the code is shown here.
  const devCode = SHOW_CODE_ON_SCREEN ? jar.get("dc_driver_dev")?.value : undefined;
  const [resendIn, blockedMin, office] = await Promise.all([resendWait(mobile), sendBlockedMinutes(mobile), officeContact()]);
  return (
    <Screen tone="white">
      <Body className="gap-[20px] pt-[16px] pb-[20px]">
        <CodeForm mobile={showMobile(mobile)} resendIn={resendIn} blockedMin={blockedMin} office={office} devCode={devCode} />
      </Body>
    </Screen>
  );
}
