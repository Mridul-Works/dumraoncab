"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { setCarShown } from "@/app/admin/fleet-actions";
import FleetCard, { ToggleArt, carMeta } from "@/components/admin/FleetCard";
import { EmptyState, ServiceBadge, btnText, cardCls } from "@/components/admin/ui";
import { CAR_TYPES, type Car, type CarType, type ServiceState } from "@/lib/catalogTypes";

type GridCar = Car & { rate: string; service: ServiceState; outToday: boolean };

export default function FleetGrid({ cars }: { cars: GridCar[] }) {
  const [tab, setTab] = useState<"All" | CarType>("All");
  const types = CAR_TYPES.filter((t) => cars.some((c) => c.type === t));
  const visible = tab === "All" ? cars : cars.filter((c) => c.type === tab);

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
