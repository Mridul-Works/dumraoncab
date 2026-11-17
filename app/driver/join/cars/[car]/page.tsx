import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { PhotoTile, UploadBox, UploadFailedNotice, UploadGroup } from "@/components/driver/camera";
import { CarDetailsForm } from "@/components/driver/JoinForms";
import { ProgressSteps } from "@/components/driver/fields";
import { Body, LinkBtn, Screen, Spacer, Tag, TopBar } from "@/components/driver/ui";
import { uploadCarPhoto, uploadDoc } from "@/app/driver/actions";
import { PHOTO_SIDES } from "@/lib/driverTrips";
import { requireJoining } from "../../join";

export const metadata: Metadata = { title: "Car papers" };

const PAPERS = [
  { kind: "rc", label: "RC (registration)", hint: "Front and back of the RC", short: "RC" },
  { kind: "insurance", label: "Insurance", hint: "Needed before this car takes trips", short: "insurance" },
  { kind: "permit", label: "Permit", hint: "State or all-India permit", short: "permit" },
  { kind: "puc", label: "PUC", hint: "Pollution certificate", short: "PUC" },
] as const;

// "insurance" / "insurance and PUC" / "RC, permit and PUC"
const listOf = (words: string[]) => (words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`);

// Figma 10.12 Car papers — from a car on 10.11: RC, insurance, permit, PUC and
// 4 photos. Spacing on one 8 px rhythm with grouped lists (designer comment):
// head, car, papers, photos and footer are groups 20 px apart; rows inside a
// group are 8 px apart.
export default async function CarPapersPage({ params }: { params: Promise<{ car: string }> }) {
  const { car: carId } = await params;
  const { draft } = await requireJoining();
  if (draft.carChoice !== "own") redirect("/driver/join/review");
  const car = draft.cars.find((c) => c.id === carId);
  if (!car) notFound();
  const photos = draft.carPhotos[car.id] ?? {};
  const missing = PAPERS.filter((p) => !car.docs.some((d) => d.kind === p.kind && d.file));

  return (
    <Screen>
      <Body className="gap-[20px] pt-[8px] pb-[16px]">
        <div className="flex flex-col gap-[16px]">
          <TopBar title="Car papers" back="/driver/join/cars" />
          <ProgressSteps at={3} label="Next: check and submit" />
        </div>
        {car.model ? (
          <div className="flex items-center gap-[12px] rounded-md border border-gray-200 bg-layer p-[12px]">
            <span className="grid size-[44px] shrink-0 place-items-center rounded-sm bg-gray-50 text-primary">
              <Icon name="car-simple" size={22} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col items-start gap-[2px]">
              <span className="type-ui text-primary">{`${car.model} · ${car.number}`}</span>
              <span className="type-body-sm text-secondary">{[car.type, car.fuel, `${car.seats} seats`, car.year].join(" · ")}</span>
              <Tag>Your car</Tag>
            </span>
          </div>
        ) : (
          <CarDetailsForm car={car} />
        )}
        {car.model && (
          <>
            <section className="flex w-full flex-col gap-[12px]" aria-labelledby="papers-h">
              <h2 id="papers-h" className="type-ui text-primary">
                Papers for this car
              </h2>
              <div className="flex w-full flex-col gap-[8px]">
                <UploadGroup>
                  <UploadFailedNotice />
                  {PAPERS.map((p) => {
                    const saved = car.docs.find((d) => d.kind === p.kind && d.file);
                    return (
                      <UploadBox
                        key={p.kind}
                        label={p.label}
                        hint={p.hint}
                        done={!!saved}
                        doneHint={saved ? "Added · the office checks it" : undefined}
                        camera={{ title: `${p.label} · ${car.number}`, guide: "Fit the paper inside the box. All four corners should show.", pdf: true, page: "Car papers", check: true }}
                        action={uploadDoc}
                        fields={{ kind: p.kind, car: car.id }}
                      />
                    );
                  })}
                </UploadGroup>
              </div>
            </section>
            <section className="flex w-full flex-col gap-[12px]" aria-labelledby="photos-h">
              <div className="flex items-center justify-between gap-[12px]">
                <h2 id="photos-h" className="type-ui text-primary">
                  Photos of the car
                </h2>
                <span className="type-body-sm text-secondary">4 needed · notes scratches</span>
              </div>
              <div className="flex w-full gap-[8px]">
                {PHOTO_SIDES.map((side) => (
                  <PhotoTile key={side} side={side} done={!!photos[side]} action={uploadCarPhoto} fields={{ car: car.id, side }} />
                ))}
              </div>
            </section>
          </>
        )}
        <Spacer />
        {car.model && (
          <div className="flex w-full flex-col gap-[12px]">
            {missing.length > 0 && (
              <p className="type-body-sm text-secondary">{`No ${listOf(missing.map((m) => m.short))} yet, so this car stays off trips.`}</p>
            )}
            <LinkBtn href="/driver/join/cars">Save car</LinkBtn>
          </div>
        )}
      </Body>
    </Screen>
  );
}
