import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { firstName, shortModel } from "@/components/driver/format";
import { Art, Body, Divider, ListRow, Screen, Spacer } from "@/components/driver/ui";
import { seenApproved } from "@/app/driver/actions";
import { requireVendor } from "@/lib/driverTrips";
import { CAR_DOCS, type VendorCar } from "@/lib/vendorTypes";
import { SubmitBtn } from "@/components/driver/SubmitBtn";

export const metadata: Metadata = { title: "You are approved" };

const PAPER = { rc: "RC", insurance: "insurance", permit: "permit", puc: "PUC" } as const;
const notReady = (c: VendorCar) => CAR_DOCS.filter((k) => c.docs.find((d) => d.kind === k)?.status !== "verified");

// Figma 10.16 You are approved — when the office approves (admin 6.13 Approve
// vendor / 6.14 Vendor approved). Cars with all papers go on trips; the rest
// wait. "Go to dashboard" leads on to 10.17 (once) and the Dashboard (10.18).
export default async function ApprovedPage() {
  const { vendor } = await requireVendor();
  if (vendor.status !== "approved") redirect("/driver");
  const ready = vendor.cars.filter((c) => !notReady(c).length);
  const lead =
    vendor.kind === "owner"
      ? ready.length
        ? `Your ${ready.map((c) => shortModel(c.model)).join(" and ")} can take trips now. Turn on Available on your dashboard.`
        : "Add the missing car papers to start taking trips."
      : "The office will tell you which car to drive. Turn on Available on your dashboard.";
  return (
    <Screen>
      <Body className="gap-[20px] pt-[48px] pb-[24px]">
        <Art name="approved-illustration" />
        <div className="flex flex-col gap-[8px]">
          <h1 className="type-h2 text-primary">You are approved, {firstName(vendor.name)}</h1>
          <p className="type-ui text-secondary">{lead}</p>
        </div>
        <div className="flex flex-col rounded-md border border-gray-200 bg-layer">
          {vendor.cars.map((c) => {
            const miss = notReady(c);
            return (
              <div key={c.id}>
                <ListRow
                  icon="car-simple"
                  title={`${shortModel(c.model)} · ${c.number}`}
                  detail={miss.length ? `Add ${miss.map((k) => PAPER[k]).join(", ")} to put it on trips` : "Ready for trips"}
                />
                <Divider />
              </div>
            );
          })}
          <ListRow icon="currency-inr" title={vendor.upi || "UPI not added"} detail="Payouts every Monday" />
        </div>
        <Spacer />
        <form action={seenApproved}>
          <SubmitBtn busy="Opening…">Go to dashboard</SubmitBtn>
        </form>
      </Body>
    </Screen>
  );
}
