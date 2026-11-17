import type { Metadata } from "next";
import { bookingRef } from "@/components/admin/BookingFormat";
import { InfoCard, TripList } from "@/components/driver/Earnings";
import { fmtDay, fmtShort, inr } from "@/components/driver/format";
import { Body, Screen } from "@/components/driver/ui";
import { listMyBookings, requireApproved, weekOf } from "@/lib/driverTrips";
import { listEntriesForVendor } from "@/lib/journal";

export const metadata: Metadata = { title: "Earnings" };

// Figma 10.48 Earnings · 10.49 first week · 10.50 cash to hand over.
// Only the driver's share of trips the office approved; payouts every Monday.
export default async function EarningsPage() {
  const { vendor } = await requireApproved();
  const [entries, bookings] = await Promise.all([listEntriesForVendor(vendor.id), listMyBookings(vendor.id)]);
  const week = weekOf();
  const thisWeek = entries.filter((e) => e.date >= week.start && e.date <= week.end).sort((a, b) => b.date.localeCompare(a.date));
  const approved = thisWeek.filter((e) => e.status === "approved");
  const total = approved.reduce((s, e) => s + (e.driverCut ?? 0), 0);
  const firstWeek = entries.length === 0;

  // Last payout: the share of the latest earlier week with approved trips,
  // paid on the Monday after it.
  const earlier = entries.filter((e) => e.status === "approved" && e.date < week.start);
  const lastPayoutDay = earlier.reduce((max, e) => (weekOf(e.date).payout > max ? weekOf(e.date).payout : max), "");
  const lastPayout = lastPayoutDay ? earlier.filter((e) => weekOf(e.date).payout === lastPayoutDay).reduce((s, e) => s + (e.driverCut ?? 0), 0) : 0;

  // Cash the driver took from customers and still has to hand to the office.
  const cash = bookings.filter((b) => b.trip?.payment === "cash" && b.trip.sentAt && !b.trip.cashHandedOver && (b.trip.collected ?? 0) > 0);
  const cashTotal = cash.reduce((s, b) => s + (b.trip!.collected ?? 0), 0);

  return (
    <Screen tabs="earnings">
      <Body className="gap-[14px] pt-[20px] pb-[24px]">
        <h1 className="type-h2 text-primary">Earnings</h1>
        {cashTotal > 0 && (
          <InfoCard
            tone="amber"
            label="Cash with you"
            value={`${inr(cashTotal)} from ${cash.length === 1 ? bookingRef(cash[0]) : `${cash.length} trips`} · hand over by 9 PM`}
            tag="To hand over"
            tagTone="white"
          />
        )}
        <div className="flex w-full flex-col gap-[6px] rounded-lg border border-gray-100 bg-layer p-[18px]">
          <span className="type-body-sm text-secondary">{`This week, ${fmtShort(week.start)} to ${fmtShort(week.end)}`}</span>
          <span className="type-h1 text-primary">{inr(total)}</span>
          <span className="type-body-sm text-secondary">
            {firstWeek
              ? `No trips yet · first payout ${fmtDay(week.payout)}`
              : `${approved.length} ${approved.length === 1 ? "trip" : "trips"} · paid ${fmtDay(week.payout)}${vendor.upi ? ` to UPI ${vendor.upi}` : ""}`}
          </span>
        </div>
        {thisWeek.length > 0 ? (
          <TripList
            rows={thisWeek.map((e) => ({
              id: e.id,
              title: [e.from, e.to].filter(Boolean).join(" to "),
              day: fmtDay(e.date),
              ...(e.status === "approved" ? { amount: inr(e.driverCut ?? 0) } : { status: e.status === "fix" ? "Fix asked" : "Being checked" }),
            }))}
          />
        ) : (
          <div className="flex w-full flex-col items-center gap-[6px] rounded-lg border border-gray-100 bg-layer px-[18px] py-[28px] text-center">
            <span className="type-ui text-primary">Your share shows here after each trip</span>
            <span className="type-body-sm text-secondary">Only your share, the office pays it every Monday.</span>
          </div>
        )}
        {cashTotal === 0 && <InfoCard label="Cash with you" value="₹0 · all handed over" tag="Clear" />}
        {lastPayout > 0 && <InfoCard label="Last payout" value={`${inr(lastPayout)} on ${fmtDay(lastPayoutDay)}`} tag="Paid" />}
      </Body>
    </Screen>
  );
}
