import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/admin/Icon";
import { AutoRefresh, OfferSheet } from "@/components/driver/Today";
import { bookingRef } from "@/components/admin/BookingFormat";
import { dayChip, expiredDoc, fmtTime, num, when } from "@/components/driver/format";
import { Art, Banner, Body, Screen, Spacer } from "@/components/driver/ui";
import { getPrefs, isActive, isDoneToday, isRunning, isUnseenCancel, listMyBookings, requireApproved } from "@/lib/driverTrips";
import { listEntriesForVendor } from "@/lib/journal";
import type { Booking } from "@/lib/bookingTypes";
import { Cancelled, NextTripCard, offerFor, place, sortTrips, todayLong } from "../dashboard/parts";

export const metadata: Metadata = { title: "Today" };

// Figma 10.24 Today · 10.23 loading · 10.25 / 10.26 trip request · 10.27
// request timed out · 10.28 no trips · 10.47 trip cancelled. Today = today's
// trips: done earlier, the next one, later this week. The Available switch
// lives on the Dashboard (10.18).
export default async function TodayPage() {
  const { vendor } = await requireApproved();
  const [bookings, prefs, entries] = await Promise.all([listMyBookings(vendor.id), getPrefs(vendor.id), listEntriesForVendor(vendor.id)]);

  // 10.47: shown full screen so it is not missed.
  const cancelled = bookings.find(isUnseenCancel);
  if (cancelled) return <Cancelled b={cancelled} />;

  const paused = vendor.status === "suspended" || !!expiredDoc(vendor);
  const offer = await offerFor(bookings, !paused && (prefs.available ?? true));
  const [next, ...later] = sortTrips(bookings.filter(isActive));
  const earlier = sortTrips(bookings.filter(isDoneToday));
  const fixes = entries.filter((e) => e.status === "fix" && e.bookingId);
  const fixed = new Set(fixes.map((e) => e.bookingId));

  const sub = next
    ? isRunning(next)
      ? "on a trip now"
      : `next trip ${["Today", "Tomorrow"].includes(dayChip(next.date)) ? dayChip(next.date).toLowerCase() : dayChip(next.date)} ${fmtTime(next.time)}`.trim()
    : "nothing booked yet";

  return (
    <Screen tabs="today">
      <Body className="gap-[16px] pt-[16px] pb-[20px]">
        <div className="flex flex-col">
          <h1 className="type-h3 text-primary">Today</h1>
          <p className="type-body-sm text-secondary">{`${todayLong()} · ${sub}`}</p>
        </div>
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
        {earlier.length > 0 && (
          <TripList
            title="Earlier today"
            items={earlier.map((b) => ({
              b,
              title: [fmtTime(b.time), [b.from, b.to].filter(Boolean).map(place).join(" to ")].filter(Boolean).join(" · "),
              detail: [
                "Done",
                b.trip?.endKm != null && b.trip.startKm != null ? `${num(b.trip.endKm - b.trip.startKm)} km` : "",
                fixed.has(b.id) ? "office asked to fix" : "sent to the office",
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
          />
        )}
        {next && <NextTripCard b={next} tags />}
        {later.length > 0 && (
          <TripList
            title="Later this week"
            items={later.map((b) => ({
              b,
              title: when(b),
              detail: `${[b.from, b.to].filter(Boolean).map(place).join(" to ")}${b.service ? ` · ${b.service.toLowerCase()}` : ""}`,
            }))}
          />
        )}
        {!next && earlier.length === 0 && (
          <>
            <Spacer />
            <div className="flex flex-col items-center gap-[8px] text-center">
              <Art name="today-no-trips-illustration" />
              <h2 className="type-h3 text-primary">No trips yet</h2>
              <p className="type-body-md text-secondary">Nothing booked yet. Keep Available on in Dashboard and new trips show up here with a sound.</p>
            </div>
            <Spacer />
          </>
        )}
        {offer && <OfferSheet key={offer.id} offer={offer} back="Back to Today" />}
      </Body>
      <AutoRefresh />
    </Screen>
  );
}

// "Earlier today" / "Later this week" cards: one row per trip, opens it.
function TripList({ title, items }: { title: string; items: { b: Booking; title: string; detail: string }[] }) {
  return (
    <div className="flex flex-col gap-[8px] rounded-lg border border-gray-100 bg-layer p-[18px]">
      <p className="type-body-sm text-secondary">{title}</p>
      {items.map(({ b, title, detail }) => (
        <Link key={b.id} href={`/driver/trip/${b.id}`} className="flex min-h-[44px] items-center gap-[8px]">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="type-ui text-primary">{title}</span>
            <span className="type-body-sm text-secondary">{detail}</span>
          </span>
          <Icon name="arrow-right" size={18} className="text-secondary" />
        </Link>
      ))}
    </div>
  );
}
