import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Icon from "@/components/admin/Icon";
import { bookingRef } from "@/components/admin/BookingFormat";
import { AutoRefresh, AvailableSwitch, OfferSheet } from "@/components/driver/Today";
import { CardSkeleton, StatsSkeleton } from "@/components/driver/Skeleton";
import { carLine, clockOf, docShort, expiredDoc, expiringDoc, firstName, fmtDay, fmtLong, fmtShort, greeting, inr } from "@/components/driver/format";
import { Art, Body, LinkBtn, Notice, Screen, Spacer } from "@/components/driver/ui";
import { getPrefs, isActive, isUnseenCancel, listMyBookings, officeContact, requireApproved, weekOf } from "@/lib/driverTrips";
import { listEntriesForVendor } from "@/lib/journal";
import type { Booking } from "@/lib/bookingTypes";
import type { Vendor } from "@/lib/vendorTypes";
import { Cancelled, NextTripCard, offerFor, sortTrips, todayLong } from "./parts";

export const metadata: Metadata = { title: "Dashboard" };

// Figma 10.18 Dashboard · 10.19 first day · 10.20 off duty · 10.21 trips
// paused · 10.22 loading. The home tab: Available switch, office notice, next
// trip and this week's money. Trip requests (10.25) and cancellations (10.47)
// show here too, so the driver sees them wherever the app opens.
export default async function DashboardPage() {
  const { vendor } = await requireApproved();
  const [bookings, prefs] = await Promise.all([listMyBookings(vendor.id), getPrefs(vendor.id)]);

  const cancelled = bookings.find(isUnseenCancel);
  if (cancelled) return <Cancelled b={cancelled} />;

  const expired = expiredDoc(vendor);
  const paused = vendor.status === "suspended" || !!expired;
  const pausedNote = expired ? `Off until the ${docShort(expired.doc.kind)} is renewed` : "Trips are paused by the office";
  const available = prefs.available ?? true;
  const active = sortTrips(bookings.filter(isActive));
  const car = vendor.cars.find((c) => c.id === active[0]?.vendorCarId) ?? vendor.cars[0];
  // 10.19: never taken a trip yet (just approved).
  const firstDay = !bookings.some((b) => b.trip && b.trip.stage !== "offered" && b.trip.stage !== "declined");
  const name = firstName(vendor.name);

  return (
    <Screen tabs="dashboard">
      <Body className={paused ? "gap-[14px] pt-[16px] pb-[24px]" : "gap-[16px] pt-[16px] pb-[20px]"}>
        <div className="flex flex-col">
          <h1 className="type-h3 text-primary">{firstDay && !paused ? `Welcome, ${name}` : `${greeting()}, ${name}`}</h1>
          <p className="type-body-sm text-secondary">{[todayLong(), car ? carLine(car) : active[0]?.car].filter(Boolean).join(" · ")}</p>
        </div>
        <AvailableSwitch on={available} paused={paused} pausedNote={pausedNote} />
        {paused ? (
          <Paused vendor={vendor} />
        ) : (
          <Suspense fallback={<Loading />}>
            <Home vendor={vendor} bookings={bookings} active={active} available={available} firstDay={firstDay} />
          </Suspense>
        )}
      </Body>
      <AutoRefresh />
    </Screen>
  );
}

async function Home({ vendor, bookings, active, available, firstDay }: { vendor: Vendor; bookings: Booking[]; active: Booking[]; available: boolean; firstDay: boolean }) {
  const [entries, offer] = await Promise.all([listEntriesForVendor(vendor.id), offerFor(bookings, available)]);
  const next = active[0];
  const week = weekOf();
  const approved = entries.filter((e) => e.date >= week.start && e.date <= week.end && e.status === "approved");
  const share = approved.reduce((s, e) => s + (e.driverCut ?? 0), 0);
  const fix = entries.filter((e) => e.status === "fix" && e.bookingId).sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""))[0];
  const renew = expiringDoc(vendor);

  // One office notice at a time: a trip to fix first, then a paper to renew.
  const notice = fix ? (
    <Link href={`/driver/trip/${fix.bookingId}`} className="block">
      <Notice title={`From the office${fix.reviewedAt ? ` · ${clockOf(fix.reviewedAt)}` : ""}`}>
        {fix.fixNote || `Please fix trip ${bookingRef({ id: fix.bookingId! })} and send it again.`}
      </Notice>
    </Link>
  ) : renew ? (
    <Link href="/driver/account/documents" className="block">
      <Notice title={`${renew.label} renews on ${fmtShort(renew.doc.validTill!)}`}>Upload the new one in Profile so your trips don’t pause.</Notice>
    </Link>
  ) : null;

  if (firstDay && !next && entries.length === 0)
    return (
      <>
        {notice}
        <Spacer />
        <div className="flex flex-col items-center gap-[8px] text-center">
          <Art name="today-no-trips-illustration" />
          <h2 className="type-h3 text-primary">No trips yet</h2>
          <p className="type-body-md text-secondary">You are approved. Keep Available on and the office sends trips here with a sound.</p>
        </div>
        <Spacer />
        {offer && <OfferSheet key={offer.id} offer={offer} back="Back to dashboard" />}
      </>
    );

  return (
    <>
      {notice}
      {next ? (
        <NextTripCard b={next} />
      ) : (
        <div className="flex flex-col gap-[4px] rounded-lg border border-gray-100 bg-layer p-[18px]">
          <span className="type-body-sm text-secondary">Next trip</span>
          <span className="type-ui text-primary">Nothing booked yet</span>
          <span className="type-body-sm text-secondary">
            {available ? "New trips from the office show up here with a sound." : "You are off duty. Turn on Available to get trips."}
          </span>
        </div>
      )}
      <Link href="/driver/earnings" className="flex flex-col gap-[8px] rounded-lg border border-gray-100 bg-layer p-[18px] hover:bg-layer-hover">
        <span className="type-body-sm text-secondary">This week</span>
        <span className="flex items-center gap-[8px]">
          <span className="flex min-w-0 flex-1 flex-col gap-[4px]">
            <span className="type-h3 text-primary">{inr(share)}</span>
            <span className="type-body-sm text-secondary">
              {[
                `Your share from ${approved.length} ${approved.length === 1 ? "trip" : "trips"}`,
                vendor.rating ? `rating ${vendor.rating.toFixed(1)}` : "",
                `paid ${fmtDay(week.payout)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
          <Icon name="arrow-right" size={18} className="text-secondary" />
        </span>
      </Link>
      {offer && <OfferSheet key={offer.id} offer={offer} back="Back to dashboard" />}
    </>
  );
}

// 10.22 Dashboard · loading — the switch already works; cards fill in.
function Loading() {
  return (
    <>
      <StatsSkeleton />
      <CardSkeleton />
      <p className="type-body-sm text-secondary">Getting your trips…</p>
    </>
  );
}

// 10.21 Trips paused — turns on by itself when a paper expires; back once the
// office approves the new one.
async function Paused({ vendor }: { vendor: Vendor }) {
  const office = await officeContact();
  const expired = expiredDoc(vendor);
  const label = expired ? docShort(expired.doc.kind) : undefined;
  const checking = expired?.doc.status === "review";
  return (
    <>
      <Spacer />
      <div className="flex flex-col items-center gap-[8px] text-center">
        <Art name="paused-illustration" />
        <h2 className="type-h2 text-primary">Trips paused</h2>
        <p className="type-body-md text-secondary">
          {label && checking
            ? `Your new ${label} is with the office. Trips come back once they check it.`
            : label
              ? `Your ${label} expired on ${fmtLong(expired!.doc.validTill!).replace(/ \d{4}$/, "")}. Upload the new one and the office will check it today.`
              : vendor.statusReason
                ? `The office paused your trips: ${vendor.statusReason}`
                : "The office paused your trips. Call the office to talk about it."}
        </p>
      </div>
      <Spacer />
      <div className="flex flex-col gap-[14px]">
        {label && !checking && (
          <LinkBtn href="/driver/account/documents" icon="upload-simple">
            {`Upload new ${label}`}
          </LinkBtn>
        )}
        <LinkBtn href={office.tel} variant="secondary" icon="phone">
          Call the office
        </LinkBtn>
      </div>
    </>
  );
}
