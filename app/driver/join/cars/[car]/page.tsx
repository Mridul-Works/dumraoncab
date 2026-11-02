import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { PhotoTile, UploadBox } from "@/components/driver/camera";
import { CarDetailsForm } from "@/components/driver/JoinForms";
import { Body, LinkBtn, Screen, Spacer, Steps, Tag, TopBar } from "@/components/driver/ui";
import { uploadCarPhoto, uploadDoc } from "@/app/driver/actions";
import { PHOTO_SIDES } from "@/lib/driverTrips";
import { requireJoining } from "../../join";

export const metadata: Metadata = { title: "Car papers" };

const PAPERS = [
  { kind: "rc", label: "RC (registration)", hint: "Front and back of the RC" },
  { kind: "insurance", label: "Insurance", hint: "Needed before this car takes trips" },
  { kind: "permit", label: "Permit", hint: "State or all-India permit" },
  { kind: "puc", label: "PUC", hint: "Pollution certificate" },
] as const;

// Figma 10.10 Car papers — RC, insurance, permit, PUC and 4 photos.
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
      <Body>
        <TopBar title="Car papers" back="/driver/join/cars" />
        <Steps at={3} />
        {car.model ? (
          <div className="flex items-center gap-[12px] rounded-md border border-gray-200 bg-layer p-[14px]">
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
            {PAPERS.map((p) => {
              const saved = car.docs.find((d) => d.kind === p.kind && d.file);
              return (
                <UploadBox
                  key={p.kind}
                  label={p.label}
                  hint={p.hint}
                  done={!!saved}
                  doneHint={saved ? "Added · the office checks it" : undefined}
                  camera={{ title: `${p.label} · ${car.number}`, guide: "Fit the paper inside the box. All four corners should show.", pdf: true }}
                  action={uploadDoc}
                  fields={{ kind: p.kind, car: car.id }}
                />
              );
            })}
            <div className="flex w-full flex-col gap-[8px]">
              <p className="type-ui text-primary">Photos of the car</p>
              <p className="type-body-sm text-secondary">4 photos, so scratches are noted now.</p>
              <div className="flex w-full gap-[10px]">
                {PHOTO_SIDES.map((side) => (
                  <PhotoTile key={side} side={side} done={!!photos[side]} action={uploadCarPhoto} fields={{ car: car.id, side }} />
                ))}
              </div>
            </div>
          </>
        )}
        <Spacer />
        {missing.length > 0 && car.model && (
          <p className="text-center type-body-sm text-secondary">
            {`You can add the ${missing.map((m) => (m.kind === "rc" ? "RC" : m.kind === "puc" ? "PUC" : m.kind)).join(", ")} later; the car waits off trips.`}
          </p>
        )}
        {car.model && <LinkBtn href="/driver/join/cars">Save car</LinkBtn>}
      </Body>
    </Screen>
  );
}
