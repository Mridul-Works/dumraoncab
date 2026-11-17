import Icon from "@/components/admin/Icon";
import { CancelAlert, type OfferView } from "@/components/driver/Today";
import { dayChip, fmtDay, fmtTime, inr, when } from "@/components/driver/format";
import { Body, LinkBtn, Route, Screen, Spacer, Tag } from "@/components/driver/ui";
import { SubmitBtn } from "@/components/driver/SubmitBtn";
import { closeCancelled } from "@/app/driver/actions";
import { isOffer, isOfferExpired, isRunning, offerDeadline, offeredAt, officeContact, routeDistance } from "@/lib/driverTrips";
import { istDate, tripKey, type Booking } from "@/lib/bookingTypes";

// Server pieces shared by the Dashboard (10.18–10.22) and Today (10.23–10.28).

// "Fri 30 Oct" for today, in Indian time.
export const todayLong = () => fmtDay(istDate());

// First part of an address: "Naya Bazar, Dumraon" → "Naya Bazar".
export const place = (s: string) => s.split(",")[0].trim();

export const sortTrips = (list: Booking[]) => [...list].sort((a, b) => tripKey(a).localeCompare(tripKey(b)));

// The oldest trip request still waiting for this driver (10.25 / 10.27). None
// while off duty or paused: booked trips stay, new ones stop.
export async function offerFor(bookings: Booking[], on: boolean): Promise<OfferView | undefined> {
  if (!on) return undefined;
  const offer = bookings.filter(isOffer).sort((a, b) => offeredAt(a).localeCompare(offeredAt(b)))[0];
  if (!offer) return undefined;
  const office = await officeContact();
  return {
    id: offer.id,
    when: when(offer),
    from: offer.from,
    to: offer.to,
    fromTime: fmtTime(offer.time) || undefined,
    distance: (await routeDistance(offer)) ?? "—",
    passengers: offer.people ? String(offer.people) : "—",
    share: offer.trip?.share != null ? inr(offer.trip.share) : "Office sets",
    deadline: offerDeadline(offer),
    expired: isOfferExpired(offer),
    officeTel: office.tel,
  };
}

// Next trip card (10.18, 10.24): green border, day chip, route, tags, button.
export function NextTripCard({ b, tags = false }: { b: Booking; tags?: boolean }) {
  const running = isRunning(b);
  return (
    <div className="flex flex-col gap-[14px] rounded-lg border-[1.5px] border-brand bg-layer p-[18px]">
      <div className="flex items-center">
        <span className="flex-1 type-body-sm text-secondary">{running ? "On a trip now" : "Next trip"}</span>
        <Tag>{dayChip(b.date)}</Tag>
      </div>
      <p className="type-h3 text-primary">{when(b)}</p>
      <Route from={b.from} to={b.to} fromTime={fmtTime(b.time) || undefined} />
      {tags && (b.service || b.people) ? (
        <div className="flex flex-wrap gap-[6px]">
          {b.service && <Tag tone="gray">{b.service}</Tag>}
          {b.people ? <Tag tone="gray">{`${b.people} ${b.people === 1 ? "person" : "people"}`}</Tag> : null}
        </div>
      ) : null}
      <LinkBtn href={`/driver/trip/${b.id}`}>{running ? "Continue trip" : "View trip"}</LinkBtn>
    </div>
  );
}

// 10.47 Trip cancelled — full screen with a sound, so it is not missed.
export function Cancelled({ b }: { b: Booking }) {
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
            {`The office cancelled ${[when(b).replace(" · ", ", "), [b.from, b.to].filter(Boolean).map(place).join(" to ")].filter(Boolean).join(", ")}.`}
            {b.cancelReason ? ` ${b.cancelReason.replace(/^./, (c) => c.toUpperCase())}.`.replace("..", ".") : ""}
          </p>
          <Tag>You are free for new trips</Tag>
        </div>
        <Spacer />
        <form action={close}>
          <SubmitBtn busy="Opening…">Back to dashboard</SubmitBtn>
        </form>
      </Body>
      <CancelAlert id={b.id} />
    </Screen>
  );
}
