import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { carDocLabel, carLine, clockOf, dayOf, expiresSoon, fmtShort, isExpired } from "@/components/driver/format";
import { Body, Divider, LinkBtn, ListRow, Screen, Spacer, Tag, TopBar } from "@/components/driver/ui";
import { CAR_DOCS, type VendorCar } from "@/lib/vendorTypes";
import { getPrefs, officeContact, PHOTO_SIDES, requireApproved } from "@/lib/driverTrips";

// "RC, insurance and permit valid" + a tag for the paper that needs attention.
function CarPapers({ car }: { car: VendorCar }) {
  const docs = CAR_DOCS.map((k) => car.docs.find((d) => d.kind === k) ?? { kind: k, status: "missing" as const });
  const ok = docs.filter((d) => d.status === "verified" && !isExpired(d) && !expiresSoon(d));
  const attention = docs.find((d) => d.status !== "verified" || isExpired(d) || expiresSoon(d));
  const names = ok.map((d) => (d.kind === "insurance" || d.kind === "permit" ? d.kind : carDocLabel(d.kind)));
  const detail = names.length ? `${names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0]} valid` : "Papers need checking";
  const tag = attention
    ? attention.validTill && (isExpired(attention) || expiresSoon(attention))
      ? `${carDocLabel(attention.kind)} ${fmtShort(attention.validTill)}`
      : attention.status === "review"
        ? `${carDocLabel(attention.kind)} being checked`
        : `${carDocLabel(attention.kind)} missing`
    : undefined;
  return (
    <ListRow
      icon="file-text"
      title="Papers"
      detail={detail}
      href="/driver/account/documents"
      trailing={
        <span className="flex items-center gap-[8px]">
          {tag && <Tag tone="amber">{tag}</Tag>}
          <Icon name="arrow-right" size={18} className="text-secondary" />
        </span>
      }
    />
  );
}

export const metadata: Metadata = { title: "Your car" };

// Figma 10.45 Your car — a car problem is a phone call, so the office can swap the car fast.
export default async function YourCarPage() {
  const { vendor } = await requireApproved();
  if (!vendor.cars.length) redirect("/driver/account");
  const [prefs, office] = await Promise.all([getPrefs(vendor.id), officeContact()]);

  return (
    <Screen>
      <Body>
        <TopBar title={vendor.cars.length > 1 ? "Your cars" : "Your car"} back="/driver/account" />
        {vendor.cars.map((car) => {
          const photos = prefs.carPhotos?.[car.id];
          const count = PHOTO_SIDES.filter((s) => photos?.[s]).length;
          return (
            <div key={car.id} className="flex flex-col gap-[14px]">
              <div className="flex items-center gap-[12px] rounded-lg border border-gray-100 bg-layer p-[14px]">
                <span className="grid size-[44px] shrink-0 place-items-center rounded-sm bg-gray-50 text-primary">
                  <Icon name="car-simple" size={22} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="type-ui text-primary">{carLine(car)}</span>
                  <span className="type-body-sm text-secondary">{[car.type, `${car.seats} seats`, car.fuel.toLowerCase(), String(car.year)].join(" · ")}</span>
                </span>
              </div>
              <div className="flex flex-col rounded-lg border border-gray-100 bg-layer">
                <CarPapers car={car} />
                <Divider />
                <ListRow
                  icon="camera"
                  title="Handover photos"
                  detail={count ? `${count} photos${photos?.at ? ` · ${fmtShort(dayOf(photos.at))}, ${clockOf(photos.at)}` : ""}` : "No photos yet"}
                />
              </div>
            </div>
          );
        })}
        <Spacer />
        <LinkBtn href={office.tel} variant="secondary" icon="phone">
          Problem with the car? Call the office
        </LinkBtn>
      </Body>
    </Screen>
  );
}
