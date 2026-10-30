import Link from "next/link";
import Icon from "@/components/admin/Icon";
import { btnGhost, cardCls } from "@/components/admin/ui";
import { entryNet, inr, shortDate, type Car } from "@/lib/catalogTypes";
import type { JournalRecord } from "@/lib/journal";

// Building blocks for the Daily journal (Figma 4B.1 / 4B.3 / 4C.7).

export const kmText = (n: number) => `${n.toLocaleString("en-IN")} km`;
export const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const signedInr = (n: number) => (n < 0 ? `−${inr(-n)}` : inr(n));

/* ------------------------------- totals strip ------------------------------- */

export type Total = { icon: string; label: string; value: string; sub?: string; tone?: "default" | "brand" | "error"; subTone?: "default" | "amber"; highlight?: boolean };

export function Totals({ items }: { items: Total[] }) {
  return (
    <dl className={`grid grid-cols-2 overflow-hidden md:grid-cols-5 ${cardCls}`}>
      {items.map((t, i) => (
        <div
          key={t.label}
          className={`flex min-w-0 flex-col gap-1.5 border-gray-100 px-5 py-4 ${t.highlight ? "bg-hover" : ""} ${i < items.length - 1 ? "md:border-r" : ""} ${
            i % 2 === 0 && i < items.length - 1 ? "border-r" : ""
          } ${i < items.length - (items.length % 2 === 1 ? 1 : 2) ? "border-b md:border-b-0" : ""} ${i === items.length - 1 && items.length % 2 === 1 ? "col-span-2 md:col-span-1" : ""}`}
        >
          <dt className="flex items-center gap-2 type-body-sm text-secondary">
            <Icon name={t.icon} size={18} className="text-[var(--icon-secondary)]" />
            {t.label}
          </dt>
          <dd className={`truncate type-h2 tabular-nums ${t.tone === "brand" ? "text-brand" : t.tone === "error" ? "text-error" : "text-primary"}`}>{t.value}</dd>
          {t.sub && <dd className={`type-body-sm ${t.subTone === "amber" ? "text-tag-amber" : "text-secondary"}`}>{t.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}

/* ----------------------------- where the fare went ----------------------------- */

export function FareSplit({ fare, fuel, driver }: { fare: number; fuel: number; driver: number }) {
  if (fare <= 0) return null;
  const kept = Math.max(0, fare - fuel - driver);
  const fuelP = pct(fuel, fare);
  const driverP = pct(driver, fare);
  const keptP = pct(kept, fare);
  const parts = [
    { n: fuel, p: fuelP, cls: "bg-gray-300", dot: "text-gray-300", label: "Fuel" },
    { n: driver, p: driverP, cls: "bg-gray-600", dot: "text-gray-600", label: "Driver" },
    { n: kept, p: keptP, cls: "bg-brand", dot: "text-brand", label: "Kept" },
  ];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-[3px]" aria-hidden="true">
        {parts
          .filter((x) => x.n > 0)
          .map((x) => (
            <div key={x.label} className={`h-2 min-w-1 rounded-full ${x.cls}`} style={{ flex: `${x.n} 0 0` }} />
          ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <p className="type-body-sm text-secondary">Where the fare went</p>
        {parts.map((x) => (
          <p key={x.label} className="flex items-center gap-1.5 type-body-sm text-primary">
            <Icon name="dot" size={8} className={x.dot} />
            {x.label} {x.p}%
          </p>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------ panels ----------------------------------- */

export function RailPanel({ title, count, id, children }: { title: string; count?: number; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={`flex min-w-0 scroll-mt-6 flex-col ${cardCls}`}>
      <h2 className="flex items-center gap-2 border-b border-gray-100 px-[18px] pb-3 pt-3.5 type-h4 text-primary">
        {title}
        {count !== undefined && <span className="type-ui text-secondary">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

export type Attention = { key: string; title: string; detail: string; href: string };

export function AttentionList({ items }: { items: Attention[] }) {
  return (
    <ul>
      {items.map((a) => (
        <li key={a.key}>
          <Link href={a.href} scroll={false} className="flex items-center gap-2.5 border-b border-gray-100 py-3 pl-[18px] pr-3.5 hover:bg-layer-hover">
            <Icon name="warning-circle" size={18} className="text-tag-amber" />
            <span className="min-w-0 flex-1">
              <span className="block type-ui text-primary">{a.title}</span>
              <span className="block truncate type-body-sm text-secondary">{a.detail}</span>
            </span>
            <Icon name="caret-right" size={16} className="text-[var(--icon-secondary)]" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function BarRow({ name, href, sub, amount, value, max, negative }: { name: string; href: string; sub: string; amount: string; value: number; max: number; negative?: boolean }) {
  const filled = max > 0 ? Math.max(0, value) : 0;
  return (
    <Link href={href} className="flex flex-col gap-1.5 px-[18px] py-2.5 hover:bg-layer-hover">
      <span className="flex items-baseline gap-2">
        <span className="truncate type-ui text-primary">{name}</span>
        <span className="shrink-0 type-body-sm text-secondary">{sub}</span>
        <span className={`ml-auto shrink-0 type-ui ${negative ? "text-error" : "text-brand"}`}>{amount}</span>
      </span>
      <span className="flex overflow-hidden rounded-full" aria-hidden="true">
        <span className="h-1 bg-brand" style={{ flex: `${filled} 0 0` }} />
        <span className="h-1 bg-gray-100" style={{ flex: `${Math.max(0, max - filled) || (filled ? 0 : 1)} 0 0` }} />
      </span>
    </Link>
  );
}

export function ServiceRow({ title, detail, progress, tone, href }: { title: string; detail: string; progress?: number; tone: "brand" | "amber" | "error"; href: string }) {
  const bar = tone === "amber" ? "bg-[var(--tag-color-amber)]" : tone === "error" ? "bg-negative" : "bg-brand";
  return (
    <Link href={href} className="flex flex-col gap-2 px-[18px] py-3 hover:bg-layer-hover">
      <span className="flex items-center gap-2.5 type-ui text-primary">
        <Icon name="wrench" size={18} className="text-[var(--icon-secondary)]" />
        {title}
      </span>
      <span className="type-body-sm text-secondary">{detail}</span>
      {progress !== undefined && (
        <span className="flex overflow-hidden rounded-full" aria-hidden="true">
          <span className={`h-1.5 ${bar}`} style={{ flex: `${Math.round(progress * 100)} 0 0` }} />
          <span className="h-1.5 bg-gray-100" style={{ flex: `${100 - Math.round(progress * 100)} 0 0` }} />
        </span>
      )}
    </Link>
  );
}

/* --------------------------------- entries table --------------------------------- */

// Trip title and route line for one entry.
export function routeText(e: Pick<JournalRecord, "from" | "to" | "roundTrip">) {
  if (!e.to) return e.from;
  return `${e.from} → ${e.to}${e.roundTrip ? " and back" : ""}`;
}

export type EntryTag = { label: string; tone: "amber" | "gray" };

export function entryTags(e: JournalRecord): EntryTag[] {
  const tags: EntryTag[] = [];
  if (e.fare === 0 && !e.customer && !e.bookingId) tags.push({ label: "Own use", tone: "gray" });
  else if (e.fare === 0) tags.push({ label: "No fare entered", tone: "amber" });
  if (e.fare > 0 && e.fuel > e.fare) tags.push({ label: "Fuel more than fare", tone: "amber" });
  return tags;
}

const colKm = "w-[70px]";
const colFare = "w-[80px]";
const colFuel = "w-[72px]";
const colDriver = "w-[64px]";
const colNet = "w-[84px]";
const money = "hidden shrink-0 text-right md:block";

export function TableHead({ first, firstWidth }: { first: string; firstWidth: string }) {
  return (
    <div className="hidden items-start gap-4 border-b border-gray-100 py-3 pl-5 pr-[46px] type-body-sm text-secondary md:flex">
      <p className={`${firstWidth} shrink-0`}>{first}</p>
      <p className="min-w-0 flex-1">Trip</p>
      <p className={`${colKm} shrink-0 text-right`}>Km</p>
      <p className={`${colFare} shrink-0 text-right`}>Fare</p>
      <p className={`${colFuel} shrink-0 text-right`}>Fuel</p>
      <p className={`${colDriver} shrink-0 text-right`}>Driver</p>
      <p className={`${colNet} shrink-0 text-right`}>Net</p>
    </div>
  );
}

export function DayHeader({ label, sub, km, fare, fuel, driver, net }: { label: string; sub?: string; km: number; fare: number; fuel: number; driver: number; net: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-gray-100 bg-gray-50 pb-2.5 pl-5 pr-5 pt-3 md:pr-14">
      <p className="type-ui text-primary">{label}</p>
      {sub && <p className="type-body-sm text-secondary">{sub}</p>}
      <span className="flex-1" />
      <p className={`${colKm} ${money} type-body-sm text-secondary`}>{kmText(km)}</p>
      <p className={`${colFare} ${money} type-body-sm text-secondary`}>{inr(fare)}</p>
      <p className={`${colFuel} ${money} type-body-sm text-secondary`}>{inr(fuel)}</p>
      <p className={`${colDriver} ${money} type-body-sm text-secondary`}>{inr(driver)}</p>
      <p className={`${colNet} shrink-0 text-right type-ui ${net < 0 ? "text-error" : "text-primary"}`}>{signedInr(net)}</p>
    </div>
  );
}

export function EntryRow({
  e,
  lead,
  editHref,
  highlight,
}: {
  e: JournalRecord;
  lead: React.ReactNode; // car cell (overview) or date cell (one car)
  editHref: string;
  highlight?: boolean;
}) {
  const net = entryNet(e);
  const title = e.note ? [e.note, e.customer].filter(Boolean).join(" · ") : e.customer || routeText(e) || "Trip";
  const tags = entryTags(e);
  return (
    <div className={`flex items-center gap-3 border-b border-gray-100 py-3.5 pl-5 pr-3 md:gap-4 ${highlight ? "bg-hover" : ""}`}>
      {lead}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate type-body-md text-primary">{title}</p>
        <div className="flex flex-wrap items-center gap-2">
          {routeText(e) && (
            <span className="flex min-w-0 items-center gap-2 type-mono-sm text-secondary">
              <Icon name="path" size={14} className="shrink-0 text-[var(--icon-secondary)]" />
              <span className="truncate">{routeText(e)}</span>
            </span>
          )}
          {tags.map((t) => (
            <span
              key={t.label}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 type-body-sm ${t.tone === "amber" ? "bg-tag-amber text-tag-amber" : "bg-gray-50 text-secondary"}`}
            >
              {t.tone === "amber" && <Icon name="warning-circle" size={12} />}
              {t.label}
            </span>
          ))}
        </div>
      </div>
      <p className={`${colKm} ${money} type-body-md text-primary`}>{e.km != null ? kmText(e.km) : "—"}</p>
      <p className={`${colFare} ${money} type-body-md text-primary`}>{inr(e.fare)}</p>
      <p className={`${colFuel} ${money} type-body-md text-secondary`}>{inr(e.fuel)}</p>
      <p className={`${colDriver} ${money} type-body-md text-secondary`}>{inr(e.driverCut)}</p>
      <p className={`${colNet} shrink-0 text-right type-ui ${net < 0 ? "text-error" : "text-brand"}`}>{signedInr(net)}</p>
      <Link href={editHref} scroll={false} aria-label="Edit entry" className="shrink-0 rounded-full p-1 text-[var(--icon-primary)] hover:bg-layer-hover">
        <Icon name="pencil-simple" size={18} />
      </Link>
    </div>
  );
}

export function CarLead({ car, href }: { car: Car | undefined; href: string }) {
  return (
    <Link href={href} className="flex w-28 shrink-0 items-center gap-2.5 md:w-[150px]" title={car ? car.name : "Removed car"}>
      <span className="hidden size-8 shrink-0 place-items-center rounded-full bg-gray-50 text-[var(--icon-secondary)] sm:grid">
        <Icon name="car-simple" size={18} />
      </span>
      <span className="min-w-0">
        <span className="block truncate type-ui text-primary">{car ? car.name : "Removed car"}</span>
        {car?.number && <span className="block truncate type-mono-sm text-secondary">{car.number}</span>}
      </span>
    </Link>
  );
}

export function DateLead({ date, weekday }: { date: string; weekday: string }) {
  return (
    <div className="w-16 shrink-0 md:w-[110px]">
      <p className="type-ui text-primary">{shortDate(date)}</p>
      <p className="type-body-sm text-secondary">{weekday}</p>
    </div>
  );
}

// A run of days with no trips for one car, with a shortcut to log one.
export function IdleRow({ text, addHref }: { text: string; addHref: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-gray-50 py-2.5 pl-5 pr-4">
      <Icon name="calendar-blank" size={18} className="text-[var(--icon-secondary)]" />
      <p className="min-w-0 flex-1 type-ui text-secondary">{text}</p>
      <Link href={addHref} scroll={false} className={btnGhost}>
        <Icon name="plus" size={16} />
        Add missing trip
      </Link>
    </div>
  );
}

/* ---------------------------------- km per day ---------------------------------- */

export function KmChart({ days, kmByDay, today, label }: { days: string[]; kmByDay: Map<string, number>; today: string; label: string }) {
  const peak = Math.max(1, ...days.map((d) => kmByDay.get(d) ?? 0));
  const ticks = days.length > 1 ? [0, Math.round((days.length - 1) / 4), Math.round((days.length - 1) / 2), Math.round(((days.length - 1) * 3) / 4), days.length - 1] : [0];
  const tickLabel = (d: string, i: number) => (i === 0 || i === days.length - 1 ? shortDate(d) : String(Number(d.slice(8))));
  return (
    <section className={`flex min-w-0 flex-1 flex-col gap-3.5 px-5 py-4 ${cardCls}`}>
      <div className="flex items-start gap-2">
        <h2 className="flex-1 type-h4 text-primary">Km per day</h2>
        <p className="type-body-sm text-secondary">{label}</p>
      </div>
      <div className="relative h-56 overflow-hidden md:h-[319px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
        <img src="/admin-icons/journal-dot-grid.svg" alt="" width={697} height={304} className="pointer-events-none absolute left-2 top-4 max-w-none" />
        <div className="relative flex h-full items-end gap-1">
          {days.map((d) => {
            const v = kmByDay.get(d) ?? 0;
            return (
              <div key={d} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${shortDate(d)}: ${kmText(v)}`}>
                {v > 0 ? (
                  <div className={`w-full rounded-xs bg-brand ${d === today ? "" : "opacity-90"}`} style={{ height: `${Math.max(2, (v / peak) * 100)}%` }} />
                ) : (
                  <div className="h-[3px] w-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-start">
        {ticks.map((t, i) => (
          <span key={`${t}-${i}`} className="flex flex-1 type-body-sm text-secondary first:justify-start last:justify-end [&:not(:first-child):not(:last-child)]:justify-center">
            {tickLabel(days[t], t)}
          </span>
        ))}
      </div>
      <p className="flex items-center gap-1.5 type-body-sm text-secondary">
        <span aria-hidden="true" className="size-2.5 rounded-xs bg-brand" />
        Logged
      </p>
    </section>
  );
}

/* --------------------------------- service gauge --------------------------------- */

// Semicircle gauge (Figma "Service gauge", 260×150): track and ticks are the
// design's assets; the progress arc and "now" marker follow the data.
export function ServiceGauge({ start, now, due }: { start: number; now: number; due: number }) {
  const span = Math.max(1, due - start);
  const p = Math.min(1, Math.max(0, (now - start) / span));
  const cx = 130;
  const cy = 136;
  const r = 112;
  const angle = Math.PI * (1 - p);
  const x = cx + r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);
  const ticks: [number, number][] = [
    [32, 134],
    [60.12, 66.12],
    [128, 38],
    [195.88, 66.12],
    [224, 134],
  ];
  const left = Math.max(0, due - now);
  return (
    <div className="relative h-[150px] w-[260px] shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
      <img src="/admin-icons/service-gauge-track.svg" alt="" width={260} height={150} className="absolute inset-0" />
      {p > 0 && (
        <svg width={260} height={150} viewBox="0 0 260 150" fill="none" aria-hidden="true" className="absolute inset-0 overflow-visible">
          <path d={`M 18 136 A ${r} ${r} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`} stroke="var(--background-brand)" strokeWidth={14} strokeLinecap="round" />
        </svg>
      )}
      {ticks.map(([tx, ty]) => (
        // eslint-disable-next-line @next/next/no-img-element -- static design asset
        <img key={tx} src="/admin-icons/service-gauge-tick.svg" alt="" width={4} height={4} className="absolute" style={{ left: tx, top: ty }} />
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
      <img src="/admin-icons/service-gauge-now.svg" alt="" width={22} height={22} className="absolute" style={{ left: x - 11, top: y - 11 }} />
      <p className="absolute left-1/2 top-[72px] -translate-x-1/2 whitespace-nowrap type-h1 text-primary">{left.toLocaleString("en-IN")}</p>
      <p className="absolute left-1/2 top-[114px] -translate-x-1/2 whitespace-nowrap type-body-sm text-secondary">{now >= due ? "km over" : "km to go"}</p>
    </div>
  );
}
