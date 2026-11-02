import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { firstName, shortModel } from "@/components/driver/format";
import { Art, Body, btnClass, Divider, ListRow, Screen, Spacer } from "@/components/driver/ui";
import { seenApproved } from "@/app/driver/actions";
import { requireVendor } from "@/lib/driverTrips";
import { CAR_DOCS, type VendorCar } from "@/lib/vendorTypes";

export const metadata: Metadata = { title: "You are approved" };

const PAPER = { rc: "RC", insurance: "insurance", permit: "permit", puc: "PUC" } as const;
const notReady = (c: VendorCar) => CAR_DOCS.filter((k) => c.docs.find((d) => d.kind === k)?.status !== "verified");

// Figma 10.14 You are approved — when the office approves (admin 6.8).
export default async function ApprovedPage() {
  const { vendor } = await requireVendor();
  if (vendor.status !== "approved") redirect("/driver");
  const ready = vendor.cars.filter((c) => !notReady(c).length);
  const lead =
    vendor.kind === "owner"
      ? ready.length
        ? `Your ${ready.map((c) => shortModel(c.model)).join(" and ")} can take trips now. Turn on Available on Today.`
        : "Add the missing car papers to start taking trips."
      : "The office will tell you which car to drive. Turn on Available on Today.";
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
          <button type="submit" className={btnClass("primary")}>
            Go to Today
          </button>
        </form>
      </Body>
    </Screen>
  );
}
