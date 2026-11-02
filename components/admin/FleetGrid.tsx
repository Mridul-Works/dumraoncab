"use client";

import { useOptimistic, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { setCarShown } from "@/app/admin/fleet-actions";
import FleetCard, { ToggleArt, carMeta } from "@/components/admin/FleetCard";
import Icon from "@/components/admin/Icon";
import { EmptyState, ServiceBadge, btnPrimary, btnText, cardCls } from "@/components/admin/ui";
import { CAR_TYPES, type Car, type CarType, type ServiceState } from "@/lib/catalogTypes";

type GridCar = Car & { rate: string; service: ServiceState; outToday: boolean };

export default function FleetGrid({ cars }: { cars: GridCar[] }) {
  const [tab, setTab] = useState<"All" | CarType>("All");
  const types = CAR_TYPES.filter((t) => cars.some((c) => c.type === t));
  const visible = tab === "All" ? cars : cars.filter((c) => c.type === tab);

  if (cars.length === 0) return <NoCarsYet />;

  return (
    <div className="flex flex-col gap-6">
      {/* Figma "Type tabs": pill group, selected tab = inverse fill */}
      <div className="max-w-full self-start overflow-x-auto rounded-full border border-gray-100 bg-layer p-1 [scrollbar-width:none]">
        <div className="flex w-max gap-1" role="tablist" aria-label="Filter by car type">
          {(["All", ...types] as const).map((t) => {
            const on = tab === t;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-[7px] transition-colors ${
                  on ? "bg-inverse text-inverse" : "text-primary hover:bg-layer-hover"
                }`}
              >
                <span className="type-ui">{t === "All" ? "All cars" : t}</span>
                <span className={`type-body-sm ${on ? "text-secondary-inverse" : "text-secondary"}`}>
                  {t === "All" ? cars.length : cars.filter((c) => c.type === t).length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className={cardCls}>
          <EmptyState title="No cars yet">
            <Link href="/admin/fleet/new" className={btnText}>
              Add the first car →
            </Link>
          </EmptyState>
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => (
            <GridCard key={c.id} car={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

// Figma 4.6 "Fleet · no cars yet": Empty state card with the garage illustration.
function NoCarsYet() {
  return (
    <div className={`${cardCls} flex flex-col items-center py-12 sm:py-[72px]`}>
      <div className="flex w-full max-w-[520px] flex-col items-center gap-2 px-6 py-10 text-center">
        <Image src="/admin-illustrations/no-cars.svg" alt="" width={240} height={160} unoptimized className="h-40 w-60" />
        <span aria-hidden="true" className="h-3" />
        <h2 className="type-h3 text-primary">No cars yet</h2>
        <p className="type-body-md text-secondary">Add your first car. It shows on /fleet and in the booking form once it is switched on.</p>
        <div className="flex gap-3 pt-4">
          <Link href="/admin/fleet/new" className={btnPrimary}>
            <Icon name="plus" size={16} />
            Add car
          </Link>
        </div>
      </div>
    </div>
  );
}

function GridCard({ car: c }: { car: GridCar }) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(c.shown);
  const serviceAlert = c.service.level === "due" || c.service.level === "soon";

  return (
    <FleetCard
      as="li"
      name={c.name}
      rate={c.rate}
      meta={carMeta(c)}
      image={c.image}
      shown={shown}
      href={`/admin/fleet/${c.id}`}
      badges={
        c.outToday || serviceAlert ? (
          <>
            {c.outToday && <span className="rounded-full bg-tag-green px-2.5 py-1 type-body-sm text-brand">Out today</span>}
            {serviceAlert && <ServiceBadge state={c.service} />}
          </>
        ) : undefined
      }
      toggle={
        <label className={`relative shrink-0 cursor-pointer ${pending ? "cursor-wait" : ""}`}>
          <input
            type="checkbox"
            role="switch"
            checked={shown}
            disabled={pending}
            aria-label={`Show ${c.name} on the public site`}
            onChange={(e) => {
              const next = e.target.checked;
              startTransition(async () => {
                setShown(next);
                await setCarShown(c.id, next);
              });
            }}
            className="peer sr-only"
          />
          <span className="block rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--border-focus)]">
            <ToggleArt on={shown} />
          </span>
        </label>
      }
    />
  );
}
