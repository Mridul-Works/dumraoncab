import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/admin/Icon";
import { allDocs, carLine, expiresSoon, expiringDoc, docShort, fmtShort, isExpired } from "@/components/driver/format";
import { Body, Divider, ListRow, Screen, Tag } from "@/components/driver/ui";
import { signOut } from "@/app/driver/actions";
import { officeContact, requireApproved } from "@/lib/driverTrips";
import { VENDOR_KIND_LABELS } from "@/lib/vendorTypes";

export const metadata: Metadata = { title: "Account" };

// Figma 10.44 Account — short list. Payout changes go through the office.
export default async function AccountPage() {
  const { vendor } = await requireApproved();
  const office = await officeContact();
  const docs = allDocs(vendor);
  const soon = expiringDoc(vendor);
  const needs = docs.filter((r) => expiresSoon(r.doc) || isExpired(r.doc) || r.doc.status === "missing" || r.doc.status === "reupload").length;
  const car = vendor.cars[0];
  const role = vendor.kind === "owner" ? `${VENDOR_KIND_LABELS.owner} driver` : "Staff driver";

  return (
    <Screen tabs="account">
      <Body className="gap-[14px] pt-[20px] pb-[24px]">
        <div className="flex items-center gap-[14px]">
          <span className="grid size-[48px] shrink-0 place-items-center rounded-full border border-gray-100 bg-layer text-primary">
            <Icon name="user" size={24} />
          </span>
          <div className="flex min-w-0 flex-col">
            <h1 className="type-h3 text-primary">{vendor.name}</h1>
            <p className="type-body-sm text-secondary">{`${role} · ${vendor.mobile}`}</p>
          </div>
        </div>
        {car && (
          <Link href="/driver/account/car" className="flex items-center gap-[12px] rounded-lg border border-gray-100 bg-layer p-[18px] hover:bg-layer-hover">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="type-body-sm text-secondary">{vendor.cars.length > 1 ? "Your cars" : "Your car"}</span>
              <span className="type-ui text-primary">{carLine(car)}</span>
              <span className="type-body-sm text-secondary">{[car.type, `${car.seats} seats`, car.fuel.toLowerCase()].join(" · ")}</span>
            </span>
            <Icon name="arrow-right" size={18} className="text-secondary" />
          </Link>
        )}
        <div className="flex flex-col rounded-lg border border-gray-100 bg-layer py-[6px]">
          <ListRow
            icon="file-text"
            title="My documents"
            detail={soon ? `${docShort(soon.doc.kind)} expires on ${fmtShort(soon.doc.validTill!)}` : needs ? "Some papers need you" : "All papers in order"}
            href="/driver/account/documents"
            trailing={needs ? <Tag tone="amber">{`${needs} ${soon && needs === 1 ? "expiring" : needs === 1 ? "to do" : "to do"}`}</Tag> : undefined}
          />
          <Divider />
          <ListRow icon="currency-inr" title="Payout" detail={vendor.upi ? `UPI ${vendor.upi} · every Monday` : "Ask the office to add your UPI"} />
          <Divider />
          <ListRow icon="phone" title="Call the office" detail={office.display} href={office.tel} />
          <Divider />
          <form action={signOut}>
            <button type="submit" className="flex w-full items-center gap-[12px] px-[16px] py-[12px] text-left hover:bg-layer-hover">
              <Icon name="sign-out" size={20} className="text-primary" />
              <span className="type-ui text-primary">Sign out</span>
            </button>
          </form>
        </div>
      </Body>
    </Screen>
  );
}
