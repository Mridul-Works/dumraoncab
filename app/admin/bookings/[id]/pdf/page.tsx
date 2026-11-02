import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { bookingRef, fmtClock, fmtDay, fmtWhen, shiftTime, tripExtras } from "@/components/admin/BookingFormat";
import Icon from "@/components/admin/Icon";
import { StatusBadge } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/adminAuth";
import type { Booking } from "@/lib/bookingTypes";
import { inr } from "@/lib/catalogTypes";
import { getCompany, type Company } from "@/lib/company";
import { getFares } from "@/lib/fares";
import { getCar } from "@/lib/fleet";
import { driverChecklist, freeCancelHours, freeCancelTerm, routes } from "@/lib/site";
import { getBooking } from "@/lib/store";
import { getVendor } from "@/lib/vendors";
import PrintButton from "./PrintButton";

// Figma Flow 9 · Booking PDF. A printable A4 slip (794×1123) for a booking:
// ?copy=customer (9.1, sent on WhatsApp) or ?copy=driver (9.2, fare hidden,
// with trip steps and write-in boxes for the Trip log). "Print or save as
// PDF" makes the file. Company details come from the Company profile.

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ copy?: string | string[] }> };
type Copy = "customer" | "driver";

const copyOf = (v: string | string[] | undefined): Copy => (v === "driver" ? "driver" : "customer");

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const b = await getBooking((await params).id);
  if (!b) return { title: "Booking not found" };
  // The title becomes the file name when saved as PDF.
  return { title: { absolute: `${bookingRef(b)} ${copyOf((await searchParams).copy) === "driver" ? "trip slip" : "booking"}` } };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

// Distance and drive time when the trip matches one of the site's routes.
function routeFacts(b: Booking) {
  const r = b.to ? routes.find((x) => norm(b.from).includes(norm(x.from)) && norm(b.to).includes(norm(x.to))) : undefined;
  if (!r) return undefined;
  const hr = /([\d.]+)\s*h/.exec(r.duration);
  const min = /(\d+)\s*min/.exec(r.duration);
  const minutes = (hr ? Number(hr[1]) * 60 : 0) + (min ? Number(min[1]) : 0);
  return { label: `${r.distance} · about ${r.duration.replace(/[≈~]/g, "").trim()}`, minutes };
}

const officePhone = (c: Company) => `+91 ${c.phoneDisplay}`;
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

export default async function BookingPdfPage({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  const copy = copyOf((await searchParams).copy);
  const b = await getBooking(id);
  if (!b) notFound();

  const [company, fares, ownCar, vendor] = await Promise.all([
    getCompany(),
    getFares(),
    b.carId ? getCar(b.carId) : undefined,
    b.vendorId ? getVendor(b.vendorId) : undefined,
  ]);
  const vendorCar = vendor?.cars.find((c) => c.id === b.vendorCarId);
  const car = { name: vendorCar?.model ?? ownCar?.name ?? b.car, number: vendorCar?.number ?? ownCar?.number ?? "", type: vendorCar?.type ?? ownCar?.type ?? "" };

  const extras = tripExtras(b);
  const facts = routeFacts(b);
  const at = (mins: number) => (b.time ? fmtClock(shiftTime(b.date, b.time, mins).time) : "");
  const pickupAt = b.time ? fmtClock(b.time) : "";
  const dropAt = facts?.minutes && b.time ? `about ${at(facts.minutes)}` : "";
  const first = b.name.split(" ")[0];
  const people = b.people ? `${b.people} ${b.people === 1 ? "person" : "people"}` : "";
  const bags = extras.bags ? `${extras.bags} ${extras.bags === 1 ? "bag" : "bags"}` : "";
  const tags = [b.service, b.to ? (extras.roundTrip ? "Round trip" : "One way") : "", [people, bags].filter(Boolean).join(" · ")].filter(Boolean);
  const headline = [fmtDay(b.date), pickupAt].filter(Boolean).join(" · ") || "Date to be confirmed";
  const ref = bookingRef(b);

  const cancelBy = b.time ? shiftTime(b.date, b.time, -freeCancelHours * 60) : undefined;
  const terms = [...(cancelBy ? [freeCancelTerm(fmtWhen(cancelBy))] : []), ...company.terms];
  const half = Math.ceil(terms.length / 2);
  const nightNeeded = extras.roundTrip && /outstation/i.test(b.service);

  const address = [company.address.line, company.address.town, [company.address.state, company.address.pin].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-8 print:p-0">
      <style>{`@page { size: A4; margin: 0; } @media print { html, body { background: var(--layer-01); } * { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }`}</style>

      {/* Toolbar — screen only */}
      <div className="flex w-full max-w-[794px] flex-wrap items-center gap-3 print:hidden">
        <Link href={`/admin/bookings?id=${b.id}`} className="inline-flex items-center gap-1 type-body-sm text-secondary hover:text-link-hover">
          <span aria-hidden="true">←</span> Back to booking
        </Link>
        <span className="flex-1" />
        <nav className="flex gap-1 rounded-full border border-gray-100 bg-layer p-1" aria-label="Copy">
          {(["customer", "driver"] as const).map((c) => (
            <Link
              key={c}
              href={`/admin/bookings/${b.id}/pdf?copy=${c}`}
              replace
              aria-current={copy === c ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.75 type-ui ${copy === c ? "bg-inverse text-inverse" : "text-primary hover:bg-layer-hover"}`}
            >
              {c === "customer" ? "Customer copy" : "Driver copy"}
            </Link>
          ))}
        </nav>
        <PrintButton />
      </div>

      {/* A4 sheet */}
      <article className="flex min-h-[1123px] w-[794px] shrink-0 flex-col overflow-hidden border border-gray-100 bg-layer shadow-[0_1px_0_var(--border-tertiary)] print:min-h-[297mm] print:w-[210mm] print:border-0 print:shadow-none">
        {/* Header */}
        <header className="relative flex items-center gap-4 overflow-hidden border-b border-gray-100 bg-gray-50 px-12 pb-5 pt-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative dot pattern from the design */}
          <img src="/booking-pdf/header-dots.svg" alt="" width={354} height={65} className="absolute right-1 top-0 h-[65px] w-[354px]" />
          <span className="absolute left-[434px] top-0 h-[130px] w-[360px] bg-linear-to-r from-gray-50 to-transparent" />
          {company.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- uploaded logo, printed as-is
            <img src={company.logo} alt="" width={48} height={48} className="relative size-12 shrink-0 rounded-[13px] object-contain" />
          ) : (
            <span className="relative grid size-12 shrink-0 place-items-center rounded-[13px] bg-brand type-h4 text-inverse">{initials(company.name)}</span>
          )}
          <div className="relative flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="type-h3 text-primary">{company.name}</p>
            <p className="type-body-sm text-secondary">{company.tagline}</p>
          </div>
          <div className="relative flex shrink-0 flex-col items-end gap-1">
            <p className="type-ui text-primary">{copy === "driver" ? "Trip slip · driver copy" : "Booking confirmation"}</p>
            <p className="type-mono-sm text-secondary">{ref}</p>
          </div>
        </header>

        {/* Body */}
        <div className="flex flex-col gap-4 px-12 pb-3.5 pt-4.5">
          <div className="flex items-center gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p className="type-body-md text-secondary">
                {copy === "driver"
                  ? `Trip for ${[b.driverName || "the driver", car.name].filter(Boolean).join(" · ")}`
                  : `Namaste${first ? ` ${first} ji` : ""}, your cab is ${b.status === "confirmed" || b.status === "completed" ? "booked" : "requested"}`}
              </p>
              <p className="type-h1 text-primary">{headline}</p>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span key={t} className="rounded-full bg-tag-gray px-2.5 py-0.75 type-body-sm text-secondary">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <StatusBadge status={b.status} />
          </div>

          {/* Key facts */}
          <div className="flex overflow-hidden rounded-lg border border-gray-100 bg-layer">
            <Fact label="Pickup" value={pickupAt || "Time to be set"} sub={b.from} />
            {copy === "customer" ? (
              <>
                <Fact
                  label="Car"
                  value={
                    car.number ? (
                      <span className="inline-block rounded-sm border-[1.5px] border-[var(--icon-primary)] px-1.5 py-0.5 type-mono-sm text-primary">{car.number}</span>
                    ) : (
                      car.name || "Any car"
                    )
                  }
                  sub={car.number ? car.name : "Number shared before pickup"}
                />
                <Fact label="Driver" value={b.driverName || "To be shared"} sub={b.driverMobile || "Before pickup"} link={Boolean(b.driverMobile)} />
                <Fact label="Total" value={b.quote ? inr(b.quote) : "On call"} sub={b.quote ? "UPI after the trip" : "Fare to be confirmed"} />
              </>
            ) : (
              <>
                <Fact label="Customer" value={b.name || "Customer"} sub={b.phone || "No phone"} link={Boolean(b.phone)} />
                <Fact label="Passengers" value={people || "Not noted"} sub={bags || "No bags noted"} />
                {extras.flight && <Fact label="Flight" value={extras.flight} sub="Flight / train no." />}
              </>
            )}
          </div>

          {/* Route */}
          <div className="flex overflow-hidden rounded-lg border border-gray-100">
            <div className="flex min-w-0 flex-1 flex-col px-6 py-4.5">
              <Stop
                kind="pickup"
                label="Pickup"
                place={b.from}
                note={copy === "customer" && b.driverName && b.time ? `Driver calls at ${at(-10)}.` : undefined}
                time={pickupAt}
              />
              <div className="py-1 pl-1.25">
                <div className="h-7 w-0.5 bg-gray-200" />
              </div>
              <Stop kind="drop" label="Drop" place={b.to || "Local trip"} note={extras.flight ? `Flight / train ${extras.flight}` : undefined} time={dropAt} />
            </div>
            <div className="relative w-[230px] shrink-0 self-stretch overflow-hidden border-l border-gray-100 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element -- decorative route sketch from the design */}
              <img src="/booking-pdf/mini-map.svg" alt="" width={230} height={200} className="absolute -left-px top-0 h-[200px] w-[230px]" />
              {facts && (
                <span className="absolute left-3.25 top-3 rounded-full border border-gray-100 bg-layer px-2 py-0.5 type-body-sm text-primary">{facts.label}</span>
              )}
            </div>
          </div>

          {copy === "customer" ? (
            <>
              {/* Fare and payment */}
              <div className="flex gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg border border-gray-100 p-4">
                  <p className="type-h4 text-primary">Fare</p>
                  <Line label={[b.service, b.to ? `${b.from} to ${b.to}` : "", car.type].filter(Boolean).join(" · ")} value={b.quote ? inr(b.quote) : "To be confirmed"} />
                  <Line label="Night allowance" value={nightNeeded ? `${inr(fares.nightAllowance)} a night` : "Not needed"} />
                  <Line label="Tolls and parking" value="At actuals" />
                  <div className="h-px bg-gray-100" />
                  <div className="flex items-center gap-4">
                    <div className="flex flex-1 flex-col gap-0.5">
                      <p className="type-ui text-primary">Total</p>
                      <p className="type-body-sm text-secondary">Pay by UPI after the trip</p>
                    </div>
                    <p className="type-h2 text-primary">{b.quote ? inr(b.quote) : "—"}</p>
                  </div>
                </div>
                {company.upi && (
                  <div className="flex w-[200px] shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-gray-100 px-5 py-4 text-center">
                    <p className="type-h4 text-primary">Pay by UPI</p>
                    <p className="type-body-sm text-secondary">After the trip, to</p>
                    <p className="break-all type-mono-sm text-primary">{company.upi}</p>
                  </div>
                )}
              </div>

              {/* Terms */}
              {terms.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
                  <p className="type-h4 text-primary">Terms and conditions</p>
                  <div className="flex gap-6 text-secondary">
                    {[terms.slice(0, half), terms.slice(half)].map((col, c) => (
                      <ol key={c} className="flex min-w-0 flex-1 flex-col gap-1.5">
                        {col.map((t, i) => (
                          <li key={t} className="flex gap-2">
                            <span className="type-mono-sm">{String(c * half + i + 1).padStart(2, "0")}</span>
                            <span className="min-w-0 flex-1 type-body-sm">{t}</span>
                          </li>
                        ))}
                      </ol>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Your trip */}
              <div className="flex flex-col gap-3">
                <p className="type-h4 text-primary">Your trip</p>
                <ol className="flex">
                  <Step n={1} time={b.time ? at(-15) : "Before pickup"} text={`Reach ${b.from}`} />
                  <Step n={2} time={b.time ? at(-10) : "Before pickup"} text={b.phone ? `Call ${first ? `${first} ji` : "the customer"} on ${b.phone}` : "Call the office if you can't find the customer"} />
                  <Step n={3} time={dropAt || "At the drop"} text={b.to ? `Drop at ${b.to}` : "Drop the customer back"} />
                  <Step n={4} time="After the drop" text="Fill the boxes below, send a photo on WhatsApp" last />
                </ol>
              </div>

              {/* Fill after the trip */}
              <div className="flex flex-col gap-3.5 rounded-lg border border-gray-100 p-5">
                <div className="flex items-center gap-4">
                  <p className="flex-1 type-h4 text-primary">Fill after the trip</p>
                  <p className="type-body-sm text-secondary">Goes into the Trip log</p>
                </div>
                <div className="flex gap-4">
                  {[
                    ["Odometer start", "km"],
                    ["Odometer end", "km"],
                    ["Toll paid", "₹"],
                    ["Parking", "₹"],
                    ["Fuel", "₹"],
                  ].map(([label, unit]) => (
                    <div key={label} className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <p className="type-body-sm text-secondary">{label}</p>
                      <div className="flex h-10 items-center justify-end rounded-md border border-gray-200 px-2.5 type-body-sm text-secondary">{unit}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2.5 rounded-md bg-gray-50 px-3 py-2.5 text-[var(--icon-primary)]">
                  <Icon name="lock-simple" size={16} />
                  <p className="min-w-0 flex-1 type-body-sm text-secondary">Fare is not shown on this copy. The customer pays the office by UPI, do not take cash.</p>
                </div>
              </div>

              {/* Before you go */}
              <div className="flex flex-col gap-2.5">
                <p className="type-h4 text-primary">Before you go</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                  {driverChecklist.map((item) => (
                    <p key={item} className="flex items-center gap-2 type-body-sm text-primary">
                      <span className="size-4.5 shrink-0 rounded-sm border-[1.5px] border-gray-200 bg-layer" />
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <span className="flex-1" />

        {/* Footer */}
        <footer className="flex items-center gap-4 border-t border-gray-100 bg-gray-50 px-12 py-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- brand mark from the design */}
            <img src="/booking-pdf/whatsapp-logo.svg" alt="" width={18} height={18} className="size-4.5 shrink-0" />
            <div className="flex flex-col">
              <p className="type-ui text-primary">
                {copy === "driver" ? `Questions? Call the office ${officePhone(company)}` : `Need help? Call or WhatsApp ${officePhone(company)}`}
              </p>
              <p className="type-body-sm text-secondary">{copy === "driver" ? "Show this slip if the customer asks" : "Show this slip to your driver at pickup"}</p>
            </div>
          </div>
          <span className="flex-1" />
          <div className="flex flex-col items-end text-right type-body-sm text-secondary">
            {address && <p>{address}</p>}
            <p>
              {company.gstin ? `GSTIN ${company.gstin} · ` : ""}
              <span className="text-link">{company.website}</span>
            </p>
          </div>
        </footer>
      </article>
    </div>
  );
}

function Fact({ label, value, sub, link = false }: { label: string; value: React.ReactNode; sub: string; link?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 border-l border-gray-100 px-4 py-3.5 first:border-l-0">
      <p className="type-body-sm text-secondary">{label}</p>
      <div className="truncate type-h4 text-primary">{value}</div>
      <p className={`truncate type-body-sm ${link ? "text-link" : "text-secondary"}`}>{sub}</p>
    </div>
  );
}

function Stop({ kind, label, place, note, time }: { kind: "pickup" | "drop"; label: string; place: string; note?: string; time: string }) {
  return (
    <div className="flex items-start gap-3.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- route stop marker from the design */}
      <img src={`/booking-pdf/stop-${kind}.svg`} alt="" width={12} height={12} className="mt-1 size-3 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="type-body-sm text-secondary">{label}</p>
        <p className="type-h4 text-primary">{place}</p>
        {note && <p className="type-body-sm text-secondary">{note}</p>}
      </div>
      {time && <p className="shrink-0 type-ui text-primary">{time}</p>}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 type-body-md">
      <span className="min-w-0 flex-1 text-secondary">{label}</span>
      <span className="shrink-0 text-primary">{value}</span>
    </div>
  );
}

function Step({ n, time, text, last = false }: { n: number; time: string; text: string; last?: boolean }) {
  return (
    <li className="flex min-w-0 flex-1 flex-col gap-2 pr-3">
      <div className="flex items-center">
        <span
          className={`grid size-5.5 shrink-0 place-items-center rounded-full type-body-sm ${last ? "bg-brand text-on-color" : "border-[1.5px] border-brand bg-layer text-brand"}`}
        >
          {n}
        </span>
        {!last && <span className="h-[1.5px] flex-1 bg-gray-200" />}
      </div>
      <p className="type-ui text-primary">{time}</p>
      <p className="type-body-sm text-secondary">{text}</p>
    </li>
  );
}
