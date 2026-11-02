import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Art, Body, Mark, Screen } from "@/components/driver/ui";
import { SignInForm } from "@/components/driver/SignIn";
import { getDriverSession } from "@/lib/driverAuth";

export const metadata: Metadata = { title: "Sign in" };

// Figma 10.2 Sign in — mobile number only, new or returning.
export default async function SignInPage() {
  if (await getDriverSession()) redirect("/driver");
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
        <div className="flex flex-col gap-[8px]">
          <h1 className="type-h2 text-primary">Sign in</h1>
          <p className="type-body-md text-secondary">New or already driving, use your mobile number. We send a code by SMS.</p>
        </div>
        <SignInForm />
      </Body>
    </Screen>
  );
}
