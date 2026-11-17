import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/admin/Icon";
import { allDocs, carLine, expiresSoon, expiringDoc, docShort, fmtShort, isExpired } from "@/components/driver/format";
import { MenuCard, MenuRow, serviceLine } from "@/components/driver/Profile";
import { Body, Screen, Tag } from "@/components/driver/ui";
import { SubmitBtn } from "@/components/driver/SubmitBtn";
import { signOut } from "@/app/driver/actions";
import { carStatus, officeContact, requireApproved } from "@/lib/driverTrips";
import { VENDOR_KIND_LABELS } from "@/lib/vendorTypes";

export const metadata: Metadata = { title: "Profile" };

// Figma 10.51 Profile (was "Account"; the route stays /driver/account) — a
// short list. Payout changes go through the office.
export default async function ProfilePage() {
  const { vendor } = await requireApproved();
  const car = vendor.cars[0];
  const [office, status] = await Promise.all([officeContact(), car ? carStatus(car) : undefined]);
  const docs = allDocs(vendor);
  const soon = expiringDoc(vendor);
  const needs = docs.filter((r) => expiresSoon(r.doc) || isExpired(r.doc) || r.doc.status === "missing" || r.doc.status === "reupload").length;
  const role = vendor.kind === "owner" ? `${VENDOR_KIND_LABELS.owner} driver` : "Staff driver";

  return (
    <Screen tabs="profile">
      <Body className="gap-[14px] pt-[20px] pb-[24px]">
        <div className="flex items-center gap-[12px]">
          <span className="grid size-[52px] shrink-0 place-items-center rounded-full border border-gray-100 bg-layer text-primary">
            <Icon name="user" size={24} />
          </span>
          <div className="flex min-w-0 flex-col">
            <h1 className="type-h3 text-primary">{vendor.name}</h1>
            <p className="type-body-sm text-secondary">{`${role} · ${vendor.mobile}`}</p>
          </div>
        </div>
        {car && (
          <Link href="/driver/account/car" className="flex w-full items-center gap-[12px] rounded-lg border border-gray-100 bg-layer p-[18px] hover:bg-layer-hover">
            <span className="flex min-w-0 flex-1 flex-col gap-[4px]">
              <span className="type-body-sm text-secondary">{vendor.cars.length > 1 ? "Your cars" : "Your car"}</span>
              <span className="type-ui text-primary">{carLine(car)}</span>
              <span className="type-body-sm text-secondary">
                {(status && serviceLine(status)) ?? [car.type, `${car.seats} seats`, car.fuel.toLowerCase()].join(" · ")}
              </span>
            </span>
            <Icon name="arrow-right" size={18} className="text-secondary" />
          </Link>
        )}
        <MenuCard>
          <MenuRow
            icon="file-text"
            title="My documents"
            detail={soon ? `${docShort(soon.doc.kind)} expires on ${fmtShort(soon.doc.validTill!)}` : needs ? "Some papers need you" : "All papers in order"}
            href="/driver/account/documents"
            trailing={needs ? <Tag tone="amber">{`${needs} ${soon && needs === 1 ? "expiring" : "to do"}`}</Tag> : undefined}
          />
          <MenuRow icon="currency-inr" title="Payout" detail={vendor.upi ? `UPI ${vendor.upi} · every Monday` : "Ask the office to add your UPI"} />
          <MenuRow icon="phone" title="Call the office" detail={office.display} href={office.tel} />
          <form action={signOut}>
            <SubmitBtn busy="Signing out…" className="flex w-full items-center gap-[12px] py-[12px] text-left type-ui text-primary disabled:opacity-50">
              <Icon name="sign-out" size={20} className="text-primary" />
              <span className="type-ui text-primary">Sign out</span>
            </SubmitBtn>
          </form>
        </MenuCard>
      </Body>
    </Screen>
  );
}
