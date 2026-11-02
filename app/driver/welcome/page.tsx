import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { Art, Body, LinkBtn, Mark, Screen, Spacer } from "@/components/driver/ui";
import { getDriverSession } from "@/lib/driverAuth";
import { officeContact } from "@/lib/driverTrips";

export const metadata: Metadata = { title: "Welcome" };

const POINTS = [
  { icon: "calendar-check", text: "Trips sent by the office, no calls needed" },
  { icon: "currency-inr", text: "Your share shown on every trip" },
  { icon: "file-text", text: "Documents in one place, with reminders" },
];

// Figma 10.1 Welcome — first open, one button for new and returning drivers.
export default async function WelcomePage() {
  if (await getDriverSession()) redirect("/driver");
  const office = await officeContact();
  return (
    <Screen>
      <Body className="gap-[22px] pt-[28px] pb-[24px]">
        <Mark />
        <Art name="welcome-illustration" width={336} height={224} />
        <div className="flex flex-col gap-[8px]">
          <h1 className="type-h2 text-primary">Drive with Dumraon Cab</h1>
          <p className="type-ui text-secondary">Trips come to your phone. You see your share before you go, and get paid every Monday.</p>
        </div>
        <ul className="flex flex-col gap-[12px]">
          {POINTS.map((p) => (
            <li key={p.icon} className="flex items-center gap-[12px]">
              <span className="grid size-[36px] shrink-0 place-items-center rounded-sm bg-tag-green text-primary">
                <Icon name={p.icon} size={18} />
              </span>
              <span className="type-ui text-primary">{p.text}</span>
            </li>
          ))}
        </ul>
        <Spacer />
        <LinkBtn href="/driver/sign-in">Continue with mobile number</LinkBtn>
        <p className="text-center type-body-sm text-secondary">
          Need help? Call the office on{" "}
          <a href={office.tel} className="text-link underline-offset-2 hover:underline">
            {office.display}
          </a>
        </p>
      </Body>
    </Screen>
  );
}
