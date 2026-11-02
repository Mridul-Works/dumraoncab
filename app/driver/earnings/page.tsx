import type { Metadata } from "next";
import { bookingRef } from "@/components/admin/BookingFormat";
import { fmtDay, fmtShort, inr } from "@/components/driver/format";
import { Body, Card, Screen, Tag } from "@/components/driver/ui";
import { listMyBookings, requireApproved, weekOf } from "@/lib/driverTrips";
import { listEntriesForVendor } from "@/lib/journal";

export const metadata: Metadata = { title: "Earnings" };

// Figma 10.41 Earnings · 10.42 first week · 10.43 cash to hand over.
// Only the driver's share; payouts every Monday.
export default async function EarningsPage() {
  const { vendor } = await requireApproved();
  const [entries, bookings] = await Promise.all([listEntriesForVendor(vendor.id), listMyBookings(vendor.id)]);
  const week = weekOf();
  const thisWeek = entries.filter((e) => e.date >= week.start && e.date <= week.end).sort((a, b) => b.date.localeCompare(a.date));
  const approved = thisWeek.filter((e) => e.status === "approved");
  const total = approved.reduce((s, e) => s + (e.driverCut ?? 0), 0);
  const firstWeek = entries.length === 0;

  // Cash the driver took from customers and still has to hand to the office.
  const cash = bookings.filter((b) => b.trip?.payment === "cash" && b.trip.sentAt && !b.trip.cashHandedOver && (b.trip.collected ?? 0) > 0);
  const cashTotal = cash.reduce((s, b) => s + (b.trip!.collected ?? 0), 0);

  const cashCard =
    cashTotal > 0 ? (
      <div className="flex items-center gap-[12px] rounded-lg bg-tag-amber p-[18px]">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="type-body-sm text-tag-amber">Cash with you</span>
          <span className="type-ui text-primary">
            {cash.length === 1 ? `${inr(cashTotal)} from ${bookingRef(cash[0])} · hand over by 9 PM` : `${inr(cashTotal)} from ${cash.length} trips · hand over by 9 PM`}
          </span>
        </div>
        <Tag tone="white">To hand over</Tag>
      </div>
    ) : (
      <Card>
        <div className="flex items-center gap-[12px]">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="type-body-sm text-secondary">Cash with you</span>
            <span className="type-ui text-primary">₹0 · all handed over</span>
          </div>
          <Tag>Clear</Tag>
        </div>
      </Card>
    );

  return (
    <Screen tabs="earnings">
      <Body className="gap-[14px] pt-[20px] pb-[24px]">
        <h1 className="type-h2 text-primary">Earnings</h1>
        {cashTotal > 0 && cashCard}
        <Card className="gap-[6px]">
          <span className="type-body-sm text-secondary">{`This week, ${fmtShort(week.start)} to ${fmtShort(week.end)}`}</span>
          <span className="type-h1 text-primary">{inr(total)}</span>
          <span className="type-body-sm text-secondary">
            {firstWeek
              ? `No trips yet · first payout ${fmtDay(week.payout)}`
              : `${approved.length} ${approved.length === 1 ? "trip" : "trips"} · paid ${fmtDay(week.payout)}${vendor.upi ? ` to UPI ${vendor.upi}` : ""}`}
          </span>
        </Card>
        {thisWeek.length > 0 ? (
          <Card className="py-[6px]">
            {thisWeek.map((e, i) => (
              <div key={e.id} className={`flex items-center gap-[12px] py-[12px] ${i ? "border-t border-gray-100" : ""}`}>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="type-ui text-primary">{[e.from, e.to].filter(Boolean).join(" to ")}</span>
                  <span className="type-body-sm text-secondary">{fmtDay(e.date)}</span>
                </div>
                {e.status === "approved" ? (
                  <span className="type-ui text-primary">{inr(e.driverCut ?? 0)}</span>
                ) : (
                  <Tag tone="amber">{e.status === "fix" ? "Fix asked" : "Being checked"}</Tag>
                )}
              </div>
            ))}
          </Card>
        ) : (
          <Card className="items-center gap-[4px] py-[24px] text-center">
            <span className="type-ui text-primary">Your share shows here after each trip</span>
            <span className="type-body-sm text-secondary">Only your share, the office pays it every Monday.</span>
          </Card>
        )}
        {cashTotal === 0 && cashCard}
      </Body>
    </Screen>
  );
}
