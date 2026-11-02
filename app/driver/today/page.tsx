import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Icon from "@/components/admin/Icon";
import { AutoRefresh, AvailableSwitch, CancelAlert, OfferSheet } from "@/components/driver/Today";
import { bookingRef } from "@/components/admin/BookingFormat";
import { carLine, dayChip, docShort, expiredDoc, fmtLong, fmtTime, firstName, greeting, inr, when } from "@/components/driver/format";
import { Art, Banner, Body, btnClass, LinkBtn, Route, Screen, Spacer, Tag } from "@/components/driver/ui";
import { closeCancelled } from "@/app/driver/actions";
import {
  getPrefs,
  isActive,
  isOffer,
  isRunning,
  isUnseenCancel,
  listMyBookings,
  OFFER_MINUTES,
  offeredAt,
  officeContact,
  requireApproved,
  routeDistance,
  weekOf,
} from "@/lib/driverTrips";
import { listEntriesForVendor } from "@/lib/journal";
import { istDate, tripKey, type Booking } from "@/lib/bookingTypes";
import type { Vendor } from "@/lib/vendorTypes";

export const metadata: Metadata = { title: "Today" };

// Figma 10.17 Today · 10.16 loading · 10.18 / 10.19 trip request · 10.20 no
// trips · 10.21 off duty · 10.40 trip cancelled · 10.47 trips paused.
export default async function TodayPage() {
  const { vendor } = await requireApproved();
  const bookings = await listMyBookings(vendor.id);

  // 10.40: shown full screen so it is not missed.
  const cancelled = bookings.find(isUnseenCancel);
  if (cancelled) return <Cancelled b={cancelled} />;

  const prefs = await getPrefs(vendor.id);
  const expired = expiredDoc(vendor);
  const paused = vendor.status === "suspended" || !!expired;
  const pausedNote = expired ? `Off until the ${docShort(expired.doc.kind)} is renewed` : "Trips are paused by the office";
  const active = bookings.filter(isActive).sort((a, b) => tripKey(a).localeCompare(tripKey(b)));
  const car = vendor.cars.find((c) => c.id === active[0]?.vendorCarId) ?? vendor.cars[0];
  const carText = car ? carLine(car) : active[0]?.car;

  return (
    <Screen tabs="today">
      <Body className="gap-[16px] pt-[16px] pb-[20px]">
        <div className="flex flex-col">
          <h1 className="type-h3 text-primary">
            {greeting()}, {firstName(vendor.name)}
          </h1>
          <p className="type-body-sm text-secondary">{[fmtLongDay(), carText].filter(Boolean).join(" · ")}</p>
        </div>
        <AvailableSwitch on={prefs.available ?? true} paused={paused} pausedNote={pausedNote} />
        {paused ? (
          <Paused vendor={vendor} expiredLabel={expired ? docShort(expired.doc.kind) : undefined} validTill={expired?.doc.validTill} checking={expired?.doc.status === "review"} />
        ) : (
          <Suspense fallback={<Loading />}>
            <Trips vendor={vendor} bookings={bookings} available={prefs.available ?? true} />
          </Suspense>
        )}
      </Body>
      <AutoRefresh />
    </Screen>
  );
}

const fmtLongDay = () => {
  const d = istDate();
  const [y, m, day] = d.split("-").map(Number);
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
  return `${dow} ${fmtLong(d).replace(/ \d{4}$/, "")}`;
};

async function Trips({ vendor, bookings, available }: { vendor: Vendor; bookings: Booking[]; available: boolean }) {
  const active = bookings.filter(isActive).sort((a, b) => tripKey(a).localeCompare(tripKey(b)));
  // While off duty no new requests pop up; booked trips stay.
  const offer = available ? bookings.filter(isOffer).sort((a, b) => offeredAt(a).localeCompare(offeredAt(b)))[0] : undefined;
  const entries = await listEntriesForVendor(vendor.id);
  const week = weekOf();
  const thisWeek = entries.filter((e) => e.date >= week.start && e.date <= week.end);
  const share = thisWeek.filter((e) => e.status === "approved").reduce((s, e) => s + (e.driverCut ?? 0), 0);
  const fixes = entries.filter((e) => e.status === "fix" && e.bookingId);
  const [next, ...later] = active;

  const offerView = offer && {
    id: offer.id,
    when: when(offer),
    from: offer.from,
    to: offer.to,
    fromTime: fmtTime(offer.time) || undefined,
    distance: (await routeDistance(offer)) ?? "—",
    passengers: offer.people ? String(offer.people) : "—",
    share: offer.trip?.share != null ? inr(offer.trip.share) : "Office sets",
    deadline: Date.parse(offeredAt(offer)) + OFFER_MINUTES * 60000,
  };

  return (
    <>
      {fixes.map((e) => (
        <Banner
          key={e.id}
          action={
            <Link href={`/driver/trip/${e.bookingId}`} className="shrink-0 type-ui text-link">
              Fix
            </Link>
          }
        >
          {`The office asked you to fix trip ${bookingRef({ id: e.bookingId! })}.`}
        </Banner>
      ))}
      {next ? (
        <>
          <div className="flex gap-[8px]">
            <Stat value={String(thisWeek.length)} label="trips this week" />
            <Stat value={inr(share)} label="your share" />
            <Stat value={vendor.rating ? vendor.rating.toFixed(1) : "—"} label="rating" />
          </div>
          <NextTrip b={next} />
          {later.length > 0 && (
            <div className="flex flex-col gap-[8px] rounded-lg border border-gray-100 bg-layer p-[18px]">
              <p className="type-body-sm text-secondary">Later this week</p>
              {later.map((b) => (
                <Link key={b.id} href={`/driver/trip/${b.id}`} className="flex min-h-[44px] items-center gap-[8px]">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="type-ui text-primary">{when(b)}</span>
                    <span className="type-body-sm text-secondary">{[b.from, b.to].filter(Boolean).join(" to ")}{b.service ? ` · ${b.service.toLowerCase()}` : ""}</span>
                  </span>
                  <Icon name="arrow-right" size={18} className="text-secondary" />
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <Spacer />
          <div className="flex flex-col items-center gap-[8px] text-center">
            <Art name="today-no-trips-illustration" />
            <h2 className="type-h3 text-primary">No trips yet</h2>
            <p className="type-body-md text-secondary">
              {available ? "Stay available. New trips from the office show up here with a sound." : "You are off duty. Turn on Available to get trips from the office."}
            </p>
          </div>
          <Spacer />
        </>
      )}
      {offerView && <OfferSheet key={offerView.id} offer={offerView} />}
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[2px] rounded-md border border-gray-200 bg-layer p-[12px]">
      <span className="type-h4 text-primary">{value}</span>
      <span className="truncate type-body-sm text-secondary">{label}</span>
    </div>
  );
}

function NextTrip({ b }: { b: Booking }) {
  const running = isRunning(b);
  return (
    <div className="flex flex-col gap-[14px] rounded-lg border-[1.5px] border-brand bg-layer p-[18px]">
      <div className="flex items-center">
        <span className="flex-1 type-body-sm text-secondary">{running ? "On a trip now" : "Next trip"}</span>
        <Tag>{dayChip(b.date)}</Tag>
      </div>
      <p className="type-h3 text-primary">{when(b)}</p>
      <Route from={b.from} to={b.to} fromTime={fmtTime(b.time) || undefined} />
      <div className="flex flex-wrap gap-[6px]">
        {b.service && <Tag tone="gray">{b.service}</Tag>}
        {b.people ? <Tag tone="gray">{`${b.people} ${b.people === 1 ? "person" : "people"}`}</Tag> : null}
      </div>
      <LinkBtn href={`/driver/trip/${b.id}`}>{running ? "Continue trip" : "View trip"}</LinkBtn>
    </div>
  );
}

// 10.16 Today · loading — cards fill in; no spinner.
function Loading() {
  const bar = "rounded-full bg-gray-100";
  return (
    <>
      <div className="flex gap-[8px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-1 flex-col gap-[8px] rounded-md border border-gray-200 bg-layer px-[12px] py-[14px]">
            <div className={`h-[16px] w-[48px] ${bar}`} />
            <div className={`h-[10px] w-[72px] max-w-full ${bar}`} />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-[14px] rounded-md border border-gray-200 bg-layer p-[20px]">
        <div className={`h-[12px] w-[80px] ${bar}`} />
        <div className={`h-[22px] w-[220px] max-w-full ${bar}`} />
        <div className={`h-[12px] w-[260px] max-w-full ${bar}`} />
        <div className={`h-[12px] w-[200px] max-w-full ${bar}`} />
        <div className={`h-[48px] w-full ${bar}`} />
      </div>
      <p className="type-body-sm text-secondary">Getting your trips…</p>
    </>
  );
}

// 10.47 Trips paused
async function Paused({ vendor, expiredLabel, validTill, checking }: { vendor: Vendor; expiredLabel?: string; validTill?: string; checking?: boolean }) {
  const office = await officeContact();
  return (
    <>
      <Spacer />
      <div className="flex flex-col items-center gap-[8px] text-center">
        <Art name="paused-illustration" />
        <h2 className="type-h2 text-primary">Trips paused</h2>
        <p className="type-body-md text-secondary">
          {expiredLabel && checking
            ? `Your new ${expiredLabel} is with the office. Trips come back once they check it.`
            : expiredLabel
            ? `Your ${expiredLabel} expired on ${fmtLong(validTill!).replace(/ \d{4}$/, "")}. Upload the new one and the office will check it today.`
            : vendor.statusReason
              ? `The office paused your trips: ${vendor.statusReason}`
              : "The office paused your trips. Call the office to talk about it."}
        </p>
      </div>
      <Spacer />
      <div className="flex flex-col gap-[14px]">
        {expiredLabel && !checking && (
          <LinkBtn href="/driver/account/documents" icon="upload-simple">
            {`Upload new ${expiredLabel}`}
          </LinkBtn>
        )}
        <LinkBtn href={office.tel} variant="secondary" icon="phone">
          Call the office
        </LinkBtn>
      </div>
    </>
  );
}

// 10.40 Trip cancelled
function Cancelled({ b }: { b: Booking }) {
  const close = closeCancelled.bind(null, b.id);
  return (
    <Screen>
      <Body>
        <Spacer />
        <div role="alert" className="flex flex-col items-center gap-[10px] text-center">
          <span className="grid size-[64px] place-items-center rounded-full bg-tag-red text-tag-red">
            <Icon name="x" size={28} />
          </span>
          <h1 className="type-h2 text-primary">Trip cancelled</h1>
          <p className="type-body-md text-secondary">
            {`The office cancelled ${[when(b).replace(" · ", ", "), [b.from, b.to].filter(Boolean).join(" to ")].filter(Boolean).join(", ")}.`}
            {b.cancelReason ? ` ${b.cancelReason.replace(/^./, (c) => c.toUpperCase())}.`.replace("..", ".") : ""}
          </p>
          <Tag>You are free for new trips</Tag>
        </div>
        <Spacer />
        <form action={close}>
          <button type="submit" className={btnClass("primary")}>
            Back to Today
          </button>
        </form>
      </Body>
      <CancelAlert id={b.id} />
    </Screen>
  );
}
