import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { ShareButton } from "@/components/admin/newbooking/ShareMenu";
import { shareDataFor } from "@/components/admin/newbooking/shareData";
import { bookingExtras, bookingRef, clock, dayShort, durationMin, fromMin, hoursWords, norm, toMin } from "@/components/admin/newbooking/format";
import { StatusBadge, btnGhost, btnPrimary, btnText } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/adminAuth";
import { phoneDigits } from "@/lib/bookingTypes";
import { inr } from "@/lib/catalogTypes";
import { getFares } from "@/lib/fares";
import { listCars } from "@/lib/fleet";
import { routes } from "@/lib/site";
import { getBooking } from "@/lib/store";

// Figma 3B.4 "Booking saved": where "Save booking" lands. The trip at a glance,
// then Go to bookings / New booking / Download PDF / Share on WhatsApp.

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ wa?: string }> };

export const metadata: Metadata = { title: "Booking saved" };

const CHANNEL: Record<string, string> = { "phone call": "phone call", whatsapp: "WhatsApp", "walk-in": "walk-in" };

export default async function BookingSavedPage({ params, searchParams }: Props) {
  await requireAdmin();
  const [{ id }, { wa }] = await Promise.all([params, searchParams]);
  const [b, cars, fares] = await Promise.all([getBooking(id), listCars(), getFares()]);
  if (!b) notFound();

  const x = bookingExtras(b.notes, b.adminNote);
  const ref = bookingRef(b.id);
  const digits = phoneDigits(b.phone);
  const route = b.to ? routes.find((r) => norm(b.to).startsWith(norm(r.to))) : undefined;
  const mins = route ? durationMin(route.duration) : 0;
  const km = route ? Number(route.distance.match(/\d+/)?.[0] ?? 0) * (x.round ? 2 : 1) : 0;
  const eta = route && b.time ? fromMin(toMin(b.time) + mins) : "";
  const car = b.carId ? cars.find((c) => c.id === b.carId) : undefined;
  const carClass = car ? fares.perKm.find((f) => f.id === car.fareClass)?.name.split(" /")[0] : "";
  const when = [dayShort(b.date), b.time ? clock(b.time) : ""].filter(Boolean);
  const sentAt = clock(new Date(Date.parse(b.createdAt) + 5.5 * 3600 * 1000).toISOString().slice(11, 16));
  const confirmed = b.status === "confirmed";
  const who = b.name || "The customer";
  const payment = x.payment || "Cash";

  const share = shareDataFor(b);

  return (
    <div className="flex flex-col items-center">
      <Link href="/admin/bookings" className="inline-flex items-center gap-1.5 self-start type-ui text-link hover:text-link-hover">
        <Icon name="arrow-left" size={16} />
        Bookings
      </Link>

      <div className="flex w-full max-w-[760px] flex-col items-center gap-7 pt-10 md:pt-14">
        {/* Success message */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Image src="/admin-illustrations/booking-saved.svg" alt="" width={240} height={160} priority unoptimized />
          <span className="h-1" />
          <h1 className="type-h1 text-primary">Booking saved</h1>
          <p className="type-body-md text-secondary">
            {confirmed ? `${who} is booked for ${when.join(" at ")}.` : `${who}'s request is saved for ${when.join(" at ")}. Call back to confirm.`}
          </p>
          {wa === "1" && digits && (
            <p className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-gray-100 bg-layer py-2 pl-3.5 pr-4">
              <Icon name="whatsapp-logo" size={18} className="text-brand" />
              <span className="type-body-sm text-primary">
                {confirmed ? "Confirmation" : "Quote"} sent on WhatsApp to {b.phone}
              </span>
              <span className="type-body-sm text-secondary">·&nbsp;&nbsp;{sentAt}</span>
            </p>
          )}
        </div>

        {/* Booking card */}
        <section className="w-full overflow-hidden rounded-lg border border-gray-100 bg-layer shadow-[0_1px_0_0_var(--border-tertiary)]">
          <div className="flex items-center gap-3 border-b border-gray-100 py-4 pl-6 pr-4">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
              <h2 className="type-h4 text-primary">Booking</h2>
              <span className="type-mono-sm text-secondary">{ref}</span>
              <StatusBadge status={b.status} />
            </div>
            <Link href={`/admin/bookings?id=${b.id}`} className={`${btnText} px-5 py-2.5`}>
              Edit booking
            </Link>
          </div>

          <div className="flex flex-col gap-7 p-6 md:flex-row">
            {/* Route */}
            <div className="flex min-w-0 flex-1 flex-col">
              <Stop filled label={`Pickup${when.length ? ` · ${[b.time ? clock(b.time) : "", dayShort(b.date)].filter(Boolean).join(", ")}` : ""}`} place={b.from} />
              <div className="py-1 pl-[5px]">
                <span className="block h-7 w-0.5 bg-gray-200" />
              </div>
              <Stop label={`Drop${eta ? ` · about ${clock(eta)}` : ""}`} place={b.to || "Local, by the hour"} />
              {(route || x.flight) && (
                <div className="flex flex-wrap gap-2 pt-5">
                  {route && (
                    <Fact icon="path">
                      {km} km · about {hoursWords(mins * (x.round ? 2 : 1))}
                    </Fact>
                  )}
                  {x.flight && <Fact icon="airplane-tilt">Flight {x.flight}</Fact>}
                </div>
              )}
            </div>
            <span className="h-px bg-gray-100 md:h-auto md:w-px md:self-stretch" />
            {/* Details */}
            <div className="flex flex-col gap-4.5 md:w-[300px] md:shrink-0">
              <Detail icon="user" label="Customer" value={b.name || "Walk-in"} sub={[b.phone, CHANNEL[x.channel] ?? ""].filter(Boolean).join(" · ")} />
              <Detail
                icon="car-simple"
                label="Car"
                value={b.car ? `${b.car}${carClass ? ` · ${carClass}` : ""}` : "Decide later"}
                sub={[b.people ? `${b.people} ${b.people === 1 ? "person" : "people"}` : "", x.bags ? `${x.bags} bag${x.bags === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ")}
              />
              <Detail
                icon="currency-inr"
                label="Payment"
                value={payment}
                sub={payment === "Monthly bill" ? "Added to the monthly bill" : "Pays at the end of the trip"}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 bg-gray-50 px-6 py-4">
            <p className="flex min-w-0 flex-1 items-center gap-2 type-body-sm text-secondary">
              <Icon name="phone" size={16} className="shrink-0" />
              {x.note ? `Driver note: ${x.note}` : "No note for the driver."}
            </p>
            <p className="flex items-baseline gap-2.5">
              <span className="type-body-md text-secondary">Total</span>
              <span className={`type-h2 ${b.quote ? "text-primary" : "text-secondary"}`}>{b.quote ? inr(b.quote) : "₹ –"}</span>
            </p>
          </div>
        </section>

        {/* Actions */}
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/admin/bookings?saved=${b.id}`} className={btnPrimary}>
              <Icon name="arrow-right" size={16} />
              Go to bookings
            </Link>
            <Link href="/admin/bookings/new" className={btnGhost}>
              <Icon name="plus" size={16} />
              New booking
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href={`/admin/bookings/${b.id}/pdf?copy=customer`} target="_blank" rel="noreferrer" className={btnGhost}>
              <Icon name="download-simple" size={16} />
              Download PDF
            </a>
            <ShareButton data={share} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stop({ label, place, filled }: { label: string; place: string; filled?: boolean }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="flex h-4 w-3 shrink-0 items-end">
        <span className={`size-3 rounded-full ${filled ? "bg-brand" : "border-2 border-brand bg-layer"}`} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="type-body-sm text-secondary">{label}</span>
        <span className="type-body-md text-primary">{place}</span>
      </span>
    </div>
  );
}

function Fact({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 py-1.5 pl-2.5 pr-3 type-body-sm text-primary">
      <Icon name={icon} size={16} className="text-[var(--icon-primary)]" />
      {children}
    </span>
  );
}

function Detail({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon name={icon} size={20} className="text-[var(--icon-primary)]" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="type-body-sm text-secondary">{label}</span>
        <span className="type-body-md text-primary">{value}</span>
        {sub && <span className="type-body-sm text-secondary">{sub}</span>}
      </div>
    </div>
  );
}
