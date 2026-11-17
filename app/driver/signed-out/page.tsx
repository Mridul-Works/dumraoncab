import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInAgainForm } from "@/components/driver/AppStates";
import { clockOf, dayOf, fmtShort } from "@/components/driver/format";
import { Art, Body, Mark, Screen } from "@/components/driver/ui";
import { istDate } from "@/lib/bookingTypes";
import { getDriverSession, replacedSession, showMobile } from "@/lib/driverAuth";
import { officeContact } from "@/lib/driverTrips";

export const metadata: Metadata = { title: "Signed in on another phone" };

// Figma 10.55 Signed in on another phone — the same number signed in on a new
// phone (lib/driverAuth.ts keeps one phone per number), so this one was signed
// out. Signing in again here sends a new code and signs the other phone out.
export default async function SignedOutPage() {
  const replaced = await replacedSession();
  if (!replaced) redirect((await getDriverSession()) ? "/driver" : "/driver/welcome");
  const office = await officeContact();
  const day = dayOf(replaced.at);
  const when = `${day === istDate() ? "" : `on ${fmtShort(day)} `}at ${clockOf(replaced.at)}`;

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
        <Art name="signin-illustration" width={288} height={192} />
        <h1 className="type-h2 text-primary">Signed in on another phone</h1>
        <p className="type-body-md text-secondary">{`Your number was used on a new phone ${when}, so this phone was signed out. Your finished trips are safe.`}</p>
        <SignInAgainForm mobile={showMobile(replaced.mobile)} footer={`Not you? Call the office on ${office.display} right away.`} />
      </Body>
    </Screen>
  );
}
