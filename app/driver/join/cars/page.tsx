import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { AddCarButton, CarStepper } from "@/components/driver/JoinForms";
import { Body, LinkBtn, Screen, Spacer, Steps, Tag, TopBar } from "@/components/driver/ui";
import { CAR_DOCS } from "@/lib/vendorTypes";
import { requireJoining } from "../join";

export const metadata: Metadata = { title: "Your cars" };

const PAPER = { rc: "RC", insurance: "insurance", permit: "permit", puc: "PUC" } as const;

// Figma 10.9 Your cars — own-car drivers add each car.
export default async function CarsPage() {
  const { draft } = await requireJoining();
  if (!draft.name) redirect("/driver/join/details");
  if (draft.carChoice !== "own") redirect("/driver/join/review");
  return (
    <Screen>
      <Body>
        <TopBar title="Your cars" back="/driver/join/documents" />
        <Steps at={3} />
        <div className="flex items-center justify-between gap-[12px]">
          <span className="type-ui text-primary">How many cars will you drive?</span>
          <CarStepper count={draft.cars.length} />
        </div>
        {draft.cars.map((car) => {
          const added = CAR_DOCS.filter((k) => car.docs.some((d) => d.kind === k && d.file));
          const missing = CAR_DOCS.filter((k) => !added.includes(k));
          return (
            <Link key={car.id} href={`/driver/join/cars/${car.id}`} className="flex w-full flex-col gap-[10px] rounded-md border border-gray-200 bg-layer p-[14px] hover:bg-layer-hover">
              <span className="flex items-center gap-[12px]">
                <span className="grid size-[44px] shrink-0 place-items-center rounded-sm bg-gray-50 text-primary">
                  <Icon name="car-simple" size={22} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="type-ui text-primary">{car.model || "New car"}</span>
                  <span className="type-body-sm text-secondary">
                    {car.model ? [car.number, car.type, car.fuel.toLowerCase(), `${car.seats} seats`].join(" · ") : "Tap to add the car and its papers"}
                  </span>
                </span>
                <Icon name="arrow-right" size={18} className="text-secondary" />
              </span>
              {missing.length === 0 ? (
                <Tag icon="check-circle">All 4 papers added</Tag>
              ) : (
                <span>
                  <Tag tone="amber" icon="warning-circle">
                    {`${added.length} of 4 papers · ${missing.map((k) => PAPER[k]).join(", ")} missing`}
                  </Tag>
                </span>
              )}
            </Link>
          );
        })}
        <AddCarButton count={draft.cars.length} />
        <Spacer />
        <p className="text-center type-body-sm text-secondary">A car joins trips once all 4 papers are checked. You can send now and add the rest later.</p>
        {draft.cars.some((c) => c.model) ? (
          <LinkBtn href="/driver/join/review">Next: review</LinkBtn>
        ) : (
          <button type="button" disabled className="inline-flex h-[48px] w-full items-center justify-center rounded-full bg-button-primary px-[20px] type-ui text-on-color opacity-40">
            Next: review
          </button>
        )}
      </Body>
    </Screen>
  );
}
